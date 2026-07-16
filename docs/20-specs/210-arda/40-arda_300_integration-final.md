# Arda 最终对接要求 + 决策留痕（arda_300_integration-final）

> 版本：**v1.0** · 状态：三通道定型上产，对接闭环
> 定位：**产品包侧（线 B 面向）**——取代回函链（原 301–306 过程回函）。只留**最终产品侧义务** + **架构级决策详细留痕（防回退：结论 + 否决方案 + 依据）**。逐轮对账/实施流水/晋升车次已删。
> **与 [`product_310`](../../30-design/product_310_arda-integration.md) 的分工**（去重，勿两处重述）：本文 §2 = 决策**详细留痕**（唯一详细版，线 B 读它）；`product_310`（design 侧，平台视角）= 实施规划 + 交付状态 + 决策**概要索引**（指回本文）。
> 权威：接口形状以 [`arda_200_interface.md`](./30-arda_200_interface.md) 为准；契约语义以 [`product_200`](../../30-design/product_200_integration.md) / [`product_220`](../../30-design/product_220_catalog-resource-model.md) 为准。本文是"面向 arda 实现"的义务与决策合并视图。

---

## 1. 产品侧最终义务清单

三通道全部上产，arda 侧对接的最终形态：

### C1 身份

- OIDC RP（授权码 + PKCE，token 仅存服务端 Redis，浏览器仅不透明 cookie）；scopes = `openid profile email phone`（**无商业 scope**）；
- 上下文 claim（`active_org`/`active_workspace`/`roles`/`account_status`）在 **access_token**，RP 验签后读、refresh 后重取；id_token 仅认证事件（验 nonce、建会话）；
- back-channel logout 路径 = `{base}/auth/backchannel-logout`（平台按注册 URI 投递）。

### C2 权益（信封 v2，只读消费）

- 信封 = 订阅事实块（`status` + 时间戳）+ 销售轴（`tier`/`bundled`/`limits`）+ `quota_pools`；**无 `capabilities`/功能键**——档位→功能由 arda 仓内能力矩阵自持；
- 门控公式：产品 UI = `status ∈ {active, trialing, overdue}`；数据取用 = 上式 `|| bundled`；
- 短 TTL 缓存（45s），收 `subscription_changed` 事件即清缓存重拉；
- **演进容错**：容忍信封新增字段与 `status` 新枚举值（未知即降级隐藏）。

### C3 用量

- **counter**（`service.api.call`/`quality.check.run` = divisible 后报；`ai.credit` = atomic 预扣）：`local_usage.usage_raw` 缓冲 + 异步 flush，幂等 key 强制，不做本地配额裁决；
- **gauge**（`storage.bytes`）：`PUT /usage/gauge` 绝对水位快照，不进 consume；准入在字节传输前按 C2 remaining 判据，`remaining ≤ 0` 关闸新写、删除始终放行；
- **gated 不是持久状态**：`gated ⇔ C2 该 metric remaining ≤ 0`，池周期翻转后 C2 读侧自动恢复满额，下次拉取（≤45s）门自开——不要发明持久标志/解锁轮询。

### C3 provisioning（arda 作接收方）

- webhook 验签（HMAC `t=,v1=`）+ 按 `id` 幂等 + 按 `seq` 弃旧 + 一律 2xx 回执；`tenant.provisioned`→建 WS 空间、`tenant.deprovisioned`→拆除；按 `payload.plan` 忽略 beta plan 事件。

### 转化出口

- 商业决策（能不能试用/该买什么/价格）产品端零推断，一律深链到 console：`{CONSOLE_BASE}/subscribe?product=arda&intent=upgrade|renew|addon[&target_tier][&metric]`（`CONSOLE_BASE=https://console.vxture.com`，arda 侧 `NEXT_PUBLIC_CONSOLE_URL` 可配；`workspace_id` 由 console 会话解析，产品不带）；仅显式点击触发，不自动跳转；console 容错未知 intent（降级订阅管理首页）。落地页**已上产**。

### 档位

- 档位阶梯**骨架**按[`product_220`](../../30-design/product_220_catalog-resource-model.md) §1.1（所有产品共用）：SaaS 自助面 = `free/starter/pro/business`（business 定位 = pro + 席位包）；`enterprise` = 私有化/授权制、不进自助售卖面、升级引导止于 business、**席位按合同约定的具体数（无"无限席位"）**。**arda 各档具体装哪些功能/配额由 arda 自己的能力矩阵定**——本骨架不规定功能清单（D12：平台不给产品定功能）。

## 2. 架构级决策留痕（防回退——记结论 + 被否决的旧方案 + 依据）

以下每条都是曾经讨论并**否决过其它方向**的架构选择。改动前先读这里，别把已否决的方案改回来。

| 决策               | 结论                                                             | 否决的旧方案 · 依据                                                                                                          |
| ------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| C2 信封职责        | 只承载商业事实（买了什么），不承载功能解释（意味着什么）         | 否决"平台配置功能键下发"——功能语义是产品知识，平台配置它会制造第二真相源、且每加一个功能就要改契约                           |
| 档位→功能          | 归产品仓内版本化能力矩阵                                         | 否决 C2 下发 `capabilities.features`——同上                                                                                   |
| 订阅状态载体       | `status` 走 C2 实时拉取                                          | 否决"入 token claim"——权益是会话期可变状态，放认证陈述里制造双真相源；且违"entitlement 不入 token"铁律                       |
| storage 计量       | gauge 快照（时点水位，LWW）                                      | 否决 delta（漏一次 delete 即永久漂移、无源可对账）、否决"塞进 consume"（consume 是纯 counter 机、负数破坏 append-only 账务） |
| 贵/廉操作门控      | 贵操作（token）atomic 预扣前置；廉操作（api.call）divisible 后报 | 否决"全部后报"（贵操作后报的 409 拦不住已花的钱）、否决"全部预扣"（廉操作预扣增加往返、无收益）                              |
| storage 准入一致性 | 弱一致，并发短时超冲可接受，超冲水位由下次快照如实记录           | 否决 v1 引入预留/预扣——存储超冲代价只是短时磁盘、非资金损失；拦截严格度与资源单价挂钩                                        |
| 平台 C2/C3 宿主    | 独立宿主 platform-api（身份面与商业面分离）                      | 否决挂 auth-bff——登录是最高可用面，不应与随业务量线性增长的计量写流量同进程；凭证面随之分权                                  |
| S2S 传输面         | 平台内网别名 tailnet 寻址                                        | 否决公网出站——同 apex 内网 fabric，S2S 绝不走公网                                                                            |

## 3. 边界纪律（与义务同重要）

1. 不读平台库、不持 Provider Key、不复制平台主数据（只持 `org_id/workspace_id/user_id` 引用）；
2. entitlement 不入 token、不落 arda 库；
3. 用量唯一写入方 = 平台 consume 服务，arda 只缓冲上报；
4. 所有 secret 经 owner 手动转运，不经聊天/CI/仓库。

## 4. 值域对齐

平台值域权威 = `@vxture/shared`（GitHub Packages 私有 registry），导出 `TIERS`/`SUBSCRIPTION_STATUSES`/`COMPONENT_ROLES`/`MERGE_STRATEGIES`/`CONSUME_MODES`/`METRIC_KINDS` + TS 类型。arda 可 `npm i @vxture/shared` 直接 import（免手抄、永久同源；属包依赖非源码引用），或按 [`product_220`](../../30-design/product_220_catalog-resource-model.md) §3 手写同名同值。`SUBSCRIPTION_STATUSES` = 六值 `active/trialing/overdue/suspended/expired/cancelled`（数组顺序 = C2 代表状态优先级）；"从没订过" = C2 `status: null`（字段缺席，不是状态值）。
