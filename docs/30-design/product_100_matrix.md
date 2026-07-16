# Vxture 产品矩阵与分层(Product Matrix)(product_100)

> 版本:**v1.0** · 日期:2026-07-06 · 状态:**已定稿**(产品名称为终版,owner 拍板,稳定使用,除非再次修订)
> 定位:平台**产品架构层**权威——回答"平台由哪些产品组成、各在什么层、彼此什么关系"。与 [`product_110_sharing-isolation.md`](./product_110_sharing-isolation.md) v1.0 互为伴生(本文管结构,彼文管资产与授权流动);对接契约见 [`product_200_integration.md`](./product_200_integration.md)。
> 取代:外部上游 `product-matrix.md v1.1`(不再提供,本文重构);[`product-oidc-subscription.md`](./commerce/40-oidc-subscription.md) 的产品清单/定位部分(该文档已标记删除)。
> 下游:`data_platform_100_architecture.md` §1#1(产品矩阵业务目标)、product 域 seed/目录、各产品定义文档。
>
> 🧭 **产品架构文档族路由(`product_{NNN}`,2026-07-06 立族)**:编号对齐 `data_{domain}_{NNN}` 惯例——**1\*\* 架构 / 2\*\* 细化标准 / 3\*\* 实施**,编号预留扩展空间。
> **100** 本文(矩阵与分层总纲,族入口)｜**110** [`product_110_sharing-isolation.md`](./product_110_sharing-isolation.md)(共享与隔离模型)｜**200** [`product_200_integration.md`](./product_200_integration.md)(平台×产品三通道对接标准)｜**210** [`product_210_tool-protocol.md`](./product_210_tool-protocol.md)(L0 工具协议规范,**v1.0 已定稿**)｜**220** [`product_220_catalog-resource-model.md`](./product_220_catalog-resource-model.md)(目录·权益与资源模型,**v1.0 已定稿**)｜**230** [`product_230_mesh-architecture.md`](./product_230_mesh-architecture.md)(登录后跨产品通信 fabric/mesh 架构,**v1.0 已定稿**)｜**300** [`product_300_naming-migration.md`](./product_300_naming-migration.md)(目录定名迁移 runbook,规划稿)｜**310** [`product_310_arda-integration.md`](./product_310_arda-integration.md)(Arda 对接实施总纲,规划稿)。
> 族外:决策记录 = ADR-11/ADR-12(ADR 自有编号线);评审/过程留档([`sharing-isolation-review.md`](./design_sharing_100_isolation-review.md))与 owner 原稿([`inputs/`](./inputs/README.md))**不进编号体系**;各产品定义文档归 `docs/20-specs/` 产品文档线。

---

## 1. 分层定义(L0–L3)

```
L0  vxture 平台本体(非产品,无 product code)
     org/WS/身份/entitlement/计量计费/工具协议规范/共享沙箱/sharing 策略 SoT
     门户 = website / console / admin(平台位);内嵌副驾 varda
      ↓ 供养
L1  横向能力平台(跨域,被 L2/L3/技能消费)
     Atlas(模型) · Ontos(语义) · Runa(技能)
      ↓ 供养
L2  对象域平台(域能力 + P-T-A 分级资产托管,统一原型见 sharing-isolation-model §4)
     Arda(结构化数据) · Karda(非结构化知识) · Terra(时空/物理世界)
      ↓ 供养
L3  行业 agent 应用(消费同一套 L1/L2 能力面,差异仅来自数据与场景编排)
     Raven · Anlan · Forge · Xuanzhen

层外:Ruyin(client 端产品,desktop) · umbra(边界 VPN,外部,不进共享模型) · Hermes(internal)
```

判层依据:**被谁消费**。L1 被所有层消费(含 L2 与技能);L2 被 agent 消费并托管资产;L3 只消费不供给。L0 不是产品——它是让产品成立的租户/商业/协议底座(对齐既定"L0 vxture 不作 product code")。

## 2. 产品矩阵总表(终版名称)

| product_code | 名称     | 层        | 域名                                                    | OIDC                                                               | 订阅(entitlement)                           | SharingGrant                          | P 级资产                        | agent-db                                                                        | 现状                                                               |
| ------------ | -------- | --------- | ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `atlas`      | Atlas    | L1        | atlas.vxture.com                                        | 是                                                                 | 是                                          | 技能小模型经其计量,自身资产不进 grant | —                               | 否(Model Platform DB)                                                           | 即现 Model Platform 的终态产品名(服务已上生产)                     |
| `ontos`      | Ontos    | L1        | ontos.vxture.com                                        | 是                                                                 | 是                                          | Schema 资产授权模式待产品定义         | —                               | 待定义                                                                          | client 已 seed;产品定义空白                                        |
| `runa`       | Runa     | L1        | runa.ai                                                 | 是                                                                 | 是                                          | **是**(技能资产,scope=use)            | 平台技能(entitlement SKU)       | 否(纯控制面,仅元数据库)                                                         | client+product 已 seed;**定位改写**(原"多模态助手 agent"文案作废)  |
| `arda`       | Arda     | L2        | arda.vxture.com                                         | 是                                                                 | 是                                          | **是**(数据集,scope=read)             | 通用参考/主数据(asset)          | 否(目录层;SoR 在各 agent-db)                                                    | seed 占位 `data` → 改名 `arda`;**"arda=平台门户 shell"旧表述作废** |
| `karda`      | Karda    | L2        | karda.vxture.com                                        | 是                                                                 | 是                                          | **是**(知识库,scope=retrieve/apply)   | 平台知识库(asset)               | 否(全量托管,agent 基本不自建)                                                   | 全新;产品定义待建(共享模型为其前置输入)                            |
| `terra`      | Terra    | L2        | terra.vxture.com                                        | 是                                                                 | 是                                          | **是**(租户空间数据)                  | 地图/影像(brokered)+白膜(asset) | 是(业务数据留 agent-db)                                                         | 全新;产品定义待建                                                  |
| `raven`      | Raven    | L3        | raven.vxture.com                                        | 是                                                                 | 是                                          | 消费方 + 其 A 级资产可被 grant        | —                               | **是**                                                                          | client 已 seed;行业定位待产品定义                                  |
| `anlan`      | Anlan    | L3        | anlan.ai                                                | 是                                                                 | 是                                          | 同上                                  | —                               | **是**                                                                          | 同上                                                               |
| `forge`      | Forge    | L3        | forge.vxture.com                                        | 是                                                                 | 是                                          | 同上                                  | —                               | **是**                                                                          | 同上                                                               |
| `xuanzhen`   | Xuanzhen | L3        | xuanzhen.ai                                             | 是                                                                 | 是                                          | 同上                                  | —                               | **是**                                                                          | 同上                                                               |
| `ruyin`      | Ruyin    | client 端 | ruyin.vxture.com(web 面,2026-07-07 定;desktop 分发另议) | 是(client 已落活库:`ruyin.vxture.com`,scopes=openid profile email) | **否**(不进 entitlement 新引擎)             | 否(仅 Atlas/Runa 层能力互通)          | —                               | **重新定义**:client 端产品(desktop);目录+client 已注册(2026-07-07),产品定义待建 |
| `umbra`      | umbra    | 外部      | **ruyin.ai**(域名不变)                                  | 是(client_id=`umbra`,2026-07-07 切换完成)                          | **保持现状**(承继原 ruyin 租户级订阅)       | **否**(不进入共享模型)                | —                               | —                                                                               | 边界 VPN;外部仓 worker-04 栈;RP 契约照旧(参数已随 client_id 更新)  |
| `hermes`     | Hermes   | internal  | —                                                       | 否                                                                 | 否                                          | 否                                    | —                               | —                                                                               | 平台内部服务,不变                                                  |
| (varda)      | Varda    | L0 内嵌   | —                                                       | —                                                                  | 否(平台内嵌副驾,非独立产品,无 product code) | 否                                    | —                               | 独立 datasource                                                                 | 已上生产                                                           |

> 中文品牌名与 i18n 文案由运营后补(product_name/nick 双列机制已就绪);`product_code` 即本表,为稳定锚点。
> 新增域名(arda/karda/terra)为按 `{code}.vxture.com` 规则的建议值,DNS/证书随各产品接入排期。

## 3. 逐产品定位卡

**L1 横向能力平台**

- **Atlas(模型平台)**:统一模型接入/路由/配额/用量治理;大模型与专用小模型唯一宿主;唯一 LLM 出口与计量口径(推理量必过 Atlas → consume)。即现 `@vxture/service-model-platform` / Model Platform 的终态产品名(`model-platform.md` 本就声明现名非终态);Model Platform DB(key/reqlog/routing)归其运行平面。
- **Ontos(语义平台)**:实体/关系/语义 Schema 定义,被 L2 消费——**Schema 归 Ontos,实例归各 L2**(决策记录 §12#1)。产品定义待建。
- **Runa(技能平台)**:技能与专用模型资产平台,纯控制面、无运行时(判定表见共享模型 §6.7);技能准入 Rule of Two;不出现在任何调用链路。

**L2 对象域平台**(统一原型 = 能力层 + P-T-A 资产层 + 授权层,主变量托管水位线)

- **Arda(数据平台)**:通用结构化数据 + 数据汇聚共享;agent-db 是 SoR、Arda 是 SoA;目录四元组 (org, ws, product, datasource);连接器唯一登记处("连接 = Arda")。
- **Karda(知识平台)**:知识加工/检索/治理能力域,平台/组织/agent 三级知识库全量托管;跨库统一检索(可见范围并集);派生边 day-one、级联撤销("理解 = Karda")。
- **Terra(时空平台)**:数字孪生 + 基础地理 + 物联感知横向底座;托管标准化底座 + 孪生运行态;地图/影像 P 级走 brokered service 形态(测绘合规)。

**L3 行业 agent 应用**:Raven / Anlan / Forge / Xuanzhen——行业定位与领域模型归各自产品定义(待建,本文只登记层与接入形态);统一形态 = OIDC RP + agent-db(一产品一套、WS 隔离,业务面模板)+ 三通道对接 + L0 工具协议消费方。

**层外**

- **Ruyin(client 端,desktop)**:重新定义的客户端产品;不共享 entitlement 模型,Karda 知识库能力默认不开放,仅 Atlas/Runa 层能力互通;产品定义待建。
- **umbra(边界 VPN)**:域名 ruyin.ai 不变,即现平台 OIDC RP 契约(`identity-platform-ruyin-contract.md`)的实际对接方;保持现状租户级订阅模式;不进入共享模型;外部仓维护(写边界:只读)。
- **Hermes(internal)**:平台内部服务,无 OIDC/订阅。
- **Varda(内嵌副驾)**:L0 平台内嵌智能助手,非独立产品;会话/审计在独立 datasource。

## 4. 结构关系(供给总图)

见 [`product_110_sharing-isolation.md`](./product_110_sharing-isolation.md) §7.3。要点:L2 → agent 唯一直连(L0 协议 + 入口 grant∧entitlement 求值);Runa 分发不转发;Atlas 统一推理计量;Ontos 供 Schema;L0 贯穿(org/WS/entitlement/计量/协议/沙箱/sharing SoT)。

## 5. 商业化参与矩阵

| 机制                                   | 参与产品                                                                        | 说明                                              |
| -------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| workspace × product 订阅(state × tier) | atlas / ontos / runa / arda / karda / terra / raven / anlan / forge / xuanzhen  | ADR-11 权益引擎;每产品 5 档(free→enterprise)      |
| P 级资产 SKU(entitlement 售卖)         | karda(平台知识库) / terra(地图·影像·白膜) / arda(通用参考数据) / runa(平台技能) | 独立 SKU 或 tier 权益;来源审计强制(共享模型 §4.2) |
| SharingGrant(org 内)                   | arda / karda / terra 的 T/A 级资产 + runa 技能                                  | SoT = 控制面 `sharing` 域                         |
| 现状租户级订阅(豁免新引擎)             | umbra                                                                           | 承继原 ruyin 的 plan/claim,不迁移                 |
| 不参与                                 | hermes / varda / ruyin(client 端,待产品定义再议)                                | —                                                 |

## 6. 命名迁移与实施登记(docs 已定,落地为后续实施项)

本表为**目标态与迁移考量登记**,均非本轮 docs 动作;实施须按锁步纪律单独排期与授权。**实施规划权威 = [`product_300_naming-migration.md`](./product_300_naming-migration.md)**(含 ruyin→umbra 一次切换专项规划,owner 2026-07-07 拍板授权实施):

| #   | 迁移项                       | 动作                                                                                                                                                               | 考量                                                                               |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | seed `data` → `arda`         | ✅ 完成(PR #663,2026-07-07 落活库,状态权威 = product_300 §1 M1)                                                                                                    | 占位产品行,无订阅引用,可重灌阶段直接改                                             |
| 2   | `nocus` OIDC client          | ✅ 完成(退役:活库置 disabled,PR #663;状态权威 = product_300 §1 M2)                                                                                                 | Nocus 名在终版矩阵无位置                                                           |
| 3   | `vault` / `cortex` 候选名    | 废弃                                                                                                                                                               | 仅存在于旧设计稿(product-oidc-subscription),随其标记删除                           |
| 4   | `karda` / `terra` 目录项     | 新增 product + client + 域名                                                                                                                                       | 随各自产品接入排期                                                                 |
| 5   | 现 `ruyin` code → `umbra`    | ✅ **完成**(2026-07-07:活库 seed 生效 + worker-04 对端 env 切换;验证=umbra×ruyin.ai authorize 302 正控、旧 client_id 组合 400 负控、plan `umbra-free`、目录四产品) | secret 沿用原 hash(免明文转运);规划权威 = product_300 §2 v1.1                      |
| 6   | 新 `ruyin`(client 端) 目录项 | 🚧 并入 #5 同窗(product + OIDC client 落 `ruyin.vxture.com`;plan/产品定义仍待建)                                                                                   | 同一 seed 事务先改码后插入,无撞名                                                  |
| 7   | `products.layer` 列          | product 域加显式分层列(varchar CHECK: l1/l2/l3/client/external/internal)                                                                                           | 归 `data_product_200` 后续修订(铁律四:矩阵分层是既定能力);未落列前以本文为分层权威 |
| 8   | `sharing` 域 schema          | 控制面新增域(SoT)                                                                                                                                                  | 归 `data_sharing_100/200` 新设计线(待建)                                           |

## 7. 旧文档处置

- [`product-oidc-subscription.md`](./commerce/40-oidc-subscription.md):产品清单/定位被本文取代,接入通道被 [`product_200_integration.md`](./product_200_integration.md) 取代——**已标记删除**(banner);其 UUID 分配表/Phase 实施细节在删除前如仍有效须迁入接替文档或 seed 注释;
- `tenant.md` / `decisions/005` / `glossary.md` 相关条目:单层租户与旧 ruyin 语义的清理见各文件标记。
