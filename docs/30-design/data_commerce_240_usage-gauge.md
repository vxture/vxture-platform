# 计量·存量指标(gauge)上报与读侧设计(data_commerce_240)

> 版本:**v0.1 草案** · 日期:2026-07-09 · 状态:**设计稿待评审**(实施逐项授权)
> 文档族:数据架构族 `data_{domain}_{NNN}`,本文 = commerce 域 **240**(细化层,metering 子域 gauge 专题);上游 = [`data_commerce_200_metering.md`](./data_commerce_200_metering.md)(计量基座)。
> 定位:落地 **product_310 D5** —— 把 `storage.bytes` 从"过渡池"转正为真正的 **gauge(存量)**计量,补齐 `metric_kind = counter | gauge` 的**写路径与读侧**。gauge vs delta/consume 的决策依据见 [`arda_300`](../20-specs/arda/arda_300_integration-final.md) §2;值域权威见 [`product_220`](./product_220_catalog-resource-model.md) §4。

---

## 0. 问题与目标

R4 已裁定:`storage.bytes` 是**存量(gauge)**——时点水位、可升可降、永不重置、按快照上报;`service.api.call`/`quality.check.run`/`ai.credit` 是**流量(counter)**——周期累计、consume 瀑布扣减。两类**不可共用一套上报机制**。

当前(过渡态)缺口:

- `platform_metrics.kind` 已有 `counter|gauge` 值域(D7 建),`storage.bytes` 已标 `gauge`;**但无 gauge 写路径**;
- storage.bytes 物化为 `quota_pools` 一行(limit 来自 plan,`quota_used=0`),C2 恒显示满额(用不掉)——**水位无来源**;
- consume 引擎对 gauge metric **无防护**:`consume_mode` 为 NULL 时默认 `divisible`,若误把 gauge 送进 consume 会当流量瀑布扣减(现因 arda 不挂 storage 触发点而未爆,是**隐患**)。

**目标**:①gauge 写端点 `PUT /usage/gauge`(snapshot,last-write-wins);②读侧 C2 用水位算 remaining;③consume 显式拒绝 gauge;④账务不变量不破(gauge 不进 append-only 的 usage_events 扣减账)。

## 1. 分类学固化:counter vs gauge

|           | counter(流量)                                                 | gauge(存量)                                       |
| --------- | ------------------------------------------------------------- | ------------------------------------------------- |
| 例        | api.call / quality.check.run / ai.credit                      | storage.bytes                                     |
| 语义      | 周期内单调累计                                                | 时点绝对水位,可升可降                             |
| 上报      | `POST /usage/consume`(增量,瀑布扣减)                          | `PUT /usage/gauge`(快照,覆盖)                     |
| 重置      | 周期重置(reset_period)                                        | **永不重置**                                      |
| 账务      | append-only `usage_events` + `quota_pools.quota_used += took` | **不进 usage_events**;水位覆盖式存 `usage_gauges` |
| remaining | limit − used(周期感知)                                        | limit − **Σ 各产品水位**(读时求和)                |
| 强制点    | consume 时 atomic 拒/divisible 部分                           | **不拒上报**;强制在 arda 侧准入(C2 remaining)     |
| 幂等      | idempotency_key                                               | 天然(覆盖式,observed_at LWW)                      |

**铁律**:`platform_metrics.kind='gauge'` 的 metric **永不经 consume**;`kind='counter'` 的**永不经 gauge**。二者由 `metric_kind` 单一权威区分,引擎按 kind 路由。

## 2. 存储模型:limit 与 usage 分离

gauge 的"额度"与"用量"来源不同,拆两处:

- **limit(额度)**:**过渡态**仍来自 plan → 物化为 `quota_pools` 一行(`quota_limit` 来自组件 quota 的 storage.bytes 值,多订阅取合计)。gauge 池的 `quota_used` **不再有意义**(读侧忽略)。**目标态** limit 改为 ws 级存储池(base + 加油包),见 §4.1——但 usage/读侧算法不受影响;
- **usage(水位)**:新表 **`metering.usage_gauges`**,按 `(workspace_id, product_id, metric_key)` 存**最新绝对水位** + `observed_at`。arda 每次快照**覆盖**该行。

```sql
CREATE TABLE metering.usage_gauges (
    id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid          NOT NULL,                    -- →tenancy.workspaces(90)
    product_id    uuid          NOT NULL,                    -- →product.products(90)
    metric_key    varchar(64)   NOT NULL,                    -- 必为 platform_metrics.kind='gauge'
    value         bigint        NOT NULL,                    -- 当前绝对水位(bytes);允许 0
    observed_at   timestamptz   NOT NULL,                    -- arda 侧观测时刻;LWW 排序键
    updated_at    timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_usage_gauges_row UNIQUE (workspace_id, product_id, metric_key),
    CONSTRAINT chk_usage_gauges_value CHECK (value >= 0)     -- 水位非负(超冲由 remaining 转负体现,不在此)
);
CREATE INDEX idx_usage_gauges_lookup ON metering.usage_gauges (workspace_id, metric_key);
```

**为什么不塞进 `quota_pools.quota_used`**:pool 是**每订阅一行**,而 gauge 水位是**每 (workspace, product) 一个**(arda 报的是该 workspace 的 arda 存储总量,与订阅条数无关)。塞进 pool 会有"多池分摊一个水位"的语义错位。独立表 = 一水位一行,干净。

## 3. 写路径:`PUT /usage/gauge`

**端点**(auth-bff,与 consume 同宿主同鉴权):

```
PUT /platform/usage/gauge
Header: x-vxture-internal-auth: {token}   # InternalAuthGuard,与 consume 同
{ "workspace_id": "...", "product": "arda", "metric": "storage.bytes",
  "value": 5368709120, "observed_at": "2026-07-09T01:00:00Z" }
```

**处理**:

1. 校验 `metric ∈ platform_metrics WHERE kind='gauge' AND status='active'` —— 否则 **400**(`gauge metric not registered`);counter metric 送这里也 400(`use POST /usage/consume`);
2. 解析 product_code → product_id;workspace 存在性校验;
3. **last-write-wins upsert**:
   ```sql
   INSERT INTO metering.usage_gauges (workspace_id, product_id, metric_key, value, observed_at, updated_at)
   VALUES ($1,$2,$3,$4,$5, now())
   ON CONFLICT (workspace_id, product_id, metric_key) DO UPDATE
     SET value = EXCLUDED.value, observed_at = EXCLUDED.observed_at, updated_at = now()
     WHERE EXCLUDED.observed_at >= metering.usage_gauges.observed_at;   -- 旧快照丢弃
   ```
   `WHERE observed_at >=` 保证**乱序到达时旧值不覆盖新值**;
4. 返回 **200** `{ workspace_id, product, metric, value, observed_at, applied: true|false }`(`applied:false` = 收到但因更旧被丢弃,幂等语义);
5. **不写 usage_events**(gauge 不入扣减账,R4)。

**鉴权/边界**:与 consume 同 `InternalAuthGuard`;公网 nginx 不路由 `/platform/*`(仅内网)。

## 4. 读侧:C2 用水位算 remaining

C2 `GET /platform/entitlements` 的 `quota_pools` 里,gauge metric 行的 `remaining` 改由水位计算:

- **counter metric**(现状不变):`remaining = limit − quota_used`(周期感知);
- **gauge metric**(本设计):`remaining = limit − Σ usage_gauges(workspace, *, metric)` —— **跨产品求和**(arda+karda+… 各报各切片),`limit` = 该 workspace 该 metric 的 pool 额度。

**gauge 恒 workspace 共享,不走 reserved/shared 策略**(D8):存储是物理磁盘、workspace 级共享资源(biz-260),各产品报切片、平台求和,天然一个总账;reserved/shared 路由(D8)**仅适用于 counter 平台 metric**(如 ai.credit 可保留可共享)。引擎按 kind 分流:`kind='gauge'` → 读 `usage_gauges` 求和;`kind='counter'` → 现有 pool 瀑布/策略。

- **remaining 允许为负**(R4):并发准入短时超冲 → 下次快照如实记 → remaining 转负 → arda 以 `remaining ≤ 0` 关闸新上传、删除始终放行、水位随清理收敛。C2 视图形状不变(`{metric,limit,remaining,priority}`),**arda 展示代码零改动**;
- **limit 取合计(Σ)**(owner 裁定 2026-07-09):存储额度**可叠加**(买两份各 100G = 200G)。口径区分:**max 型 capability**(dataset.max 等)才是"就高合并";**pool 型**(storage/ai.credit 等 L0 资源)是**多池求和**——storage 尤其天然相加(存量)。usage 按产品切片上报**仅为归因**,limit 归 workspace。

### 4.1 storage 归属 workspace:limit 的过渡与目标模型(owner 裁定 2026-07-09)

**定性**:`storage.bytes` 是 **workspace 级资源,不是产品权益**——不该"订阅 arda 才有存储"。usage 按 `(workspace, product)` 切片上报只为**归因**(哪个产品占了多少 ws 存储),limit 归 workspace 整体。

- **过渡(v1,本设计)**:limit 暂仍由产品 `plan_component` 的 `storage.bytes` quota 贡献,多订阅**取合计(Σ)**;usage_gauges 按产品切片求和;remaining = Σ limit − Σ 切片。**读侧本设计即可支撑,不阻塞**;
- **目标(后续,登记)**:storage **全面改为 ws 级存储池**——① base 额度按 **workspace/tenant 默认授予**(不经产品订阅);② **加油包 / 扩展包**充值(`pool_source = addon_purchase`,product_220 §4.2 已预留该值);③ `storage.bytes` **移出产品 `plan_component` quota**(产品层面去掉该权益),彻底与产品订阅解耦。此项连带**激活 `addon_purchase` 机制**(product_220 §4.2 登记项),另立工作线逐项授权。

> 迁移无痛:目标模型下 limit 来源从"Σ 产品 pool"换成"ws base 池 + addon 池",而 **usage/gauge 读侧算法不变**(仍 `limit − Σ 切片水位`),只是 limit 池的 `pool_source`/归属变了。故本 gauge 设计先落,ws 存储池改造后续叠加,互不阻塞。

## 5. consume 侧防护(补隐患)

`pg-consume.repository` 增加前置:解析到 `metric ∈ platform_metrics WHERE kind='gauge'` → **立即 409/400 拒绝**(`gauge metric must use PUT /usage/gauge`),不进瀑布。修掉"consume_mode 为 NULL 默认 divisible 会把 gauge 当流量扣"的隐患。

## 6. DDL / 迁移 / 列锁

- 新表 `metering.usage_gauges`(§2)进 `50_metering.sql`;
- 跨 schema FK(workspace_id→tenancy、product_id→product)进 `90_cross_schema_fk.sql`;
- 列锁 `98_column_locks.sql`:`usage_gauges` 授 `platform_svc` 可写 `value/observed_at/updated_at`(锚 id/created…);写路径以 `platform_svc` upsert;
- 生产落地 = 增量 `CREATE TABLE IF NOT EXISTS` + FK + GRANT(**纯新增,不改现有列**,无硬改名窗口,可独立上产);storage 现有 pool 行保留(limit 源),仅读侧改从 usage_gauges 取水位。

## 7. 联调/迁移过渡

- 端点上线前(现状):storage 池 `quota_used=0`,C2 显满额,arda 本地准入按"满额"——**保守偏松**,不阻断;
- 端点上线后:arda 挂 storage 快照触发点(`recordUsage` gauge 分支或独立 job),平台 `usage_gauges` 有真值,C2remaining 反映真实水位;
- **切换无停机**:读侧对 `usage_gauges` 无行时 fallback `Σ=0`(= 满额,与过渡态一致),arda 开始上报后自然生效。

## 8. 契约补充(实施后发 arda)

- arda 侧:新增 gauge 上报客户端(`PUT /usage/gauge`,周期或写路径节流触发,报 `SUM(Dataset.sizeBytes)` 绝对值 + observed_at);storage **移出** consume buffer(本就没挂);准入逻辑不变(C2 remaining ≤ 0 关闸)。可选用 `@vxture/shared` 的 `METRIC_KINDS` 对齐值域。

## 9. 登记不做 / 出范围(v1)

- **准入预留/预扣**(R4 §4.1):存储超冲=短时磁盘非资金损失,v1 不引入"申报 size 本地预留 + 实际值冲替";运营中成问题再另设计;
- **gauge 历史/审计留痕**:`usage_gauges` 仅存最新水位(覆盖式);若需水位时序(计费/趋势),另设 `usage_gauge_history` 快照表,出范围;
- **compute.gpu/cpu 等其它 gauge**:本设计通用于任意 `kind='gauge'` 平台 metric,但 compute 类的上报方/单一计量入口随 L0 沙箱/Atlas 落地(product_220 §4.1),此处只做 storage;
- **`resets_at`/倒计时 UX**:gauge 永不重置,无此概念;
- **ws 级存储池 + 加油包/扩展包改造**(§4.1 目标态):storage 剥离产品 `plan_component` 权益、改 ws base 池 + `addon_purchase` 充值——**另立工作线逐项授权**,连带激活 product_220 §4.2 的 `addon_purchase` 登记项;本 gauge 设计不依赖它(过渡态 Σ 产品 limit 即可跑)。

## 10. 实施拆分(逐项授权)

| #   | 任务                                                       | 产出                      |
| --- | ---------------------------------------------------------- | ------------------------- |
| T1  | DDL:`usage_gauges` 表 + FK + 列锁                          | 50/90/98 + 生产增量脚本   |
| T2  | 写端点 `PUT /usage/gauge`(auth-bff + LWW upsert + 校验)    | 路由 + service + itest    |
| T3  | 读侧 C2:gauge remaining = limit − Σ 水位(引擎按 kind 分流) | entitlement 引擎改 + 单测 |
| T4  | consume 拒 gauge                                           | 一处防护 + 单测           |
| T5  | 契约补充发 arda(reply 增补)                                | docs                      |

各项独立、纯新增,无硬改名协调窗口,可分批上产。
