# 平台侧配套任务计划(支撑 template / arda 按标准重构)

> **背景**:`vxture-template`(产品模板仓)与 `vxture-arda`(参照产品)正照 product_240 + 治理标准重构;平台侧(vxture-platform)有一批**配套义务与缺口**需完善,否则产品仓走不到端到端。
> **来源**:本工作线(2026-07)分析 + §6 未落平台文档项 + 代码级缺口核准(2026-07-20)。
> **排序原则**:是否**卡住 template/arda 进度**;Tier 1 优先。
> **执行**:每项一 PR + 机检/测试验收;涉活库/发包/生产写须 owner 逐次授权。

---

## Tier 1 — 卡进度或潜在 live bug(进行中)

| #    | 任务                                                     | 为什么(卡谁)                                                                                                                                                                                                | 落点                                                  | 状态           |
| ---- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| T1-1 | **core-oidc-rp 停读 active_tenant**                      | `packages/core/oidc-rp/src/claims.ts` 仍按 `active_tenant*` 翻译,而 token 已 cutover 掉 → console/website(用此包)可能读到已不下发的 claim = 潜在 live bug;且它是 RP 参照实现,不改会带偏 template 的 RP 模块 | `packages/core/oidc-rp/` + consumers                  | 🚧 调研中→实现 |
| T1-2 | **平台"注册一个产品"runbook + 给 template 演示产品建档** | template 批 3(三通道 + 档位**在线**验证)需平台 seed:目录 product 行 + OIDC client(+beta)+ product_webhooks + webhook secret;现无此 runbook                                                                  | `docs/60-operations` runbook + `deploy/database/seed` | 🚧 调研中→实现 |
| T1-3 | **@vxture/shared 导出 C2 信封类型**                      | 信封 v2 类型(ProductEntitlementView/SubscriptionFacts/QuotaPoolView)现只在 `bff/platform-api`,不在 @shared → template/产品 C2 客户端须手抄、漂移风险                                                        | `packages/shared` + `bff/platform-api`(回引)          | 🚧 调研中→实现 |

## Tier 2 — template 批 2 照着写的契约文档(§6 未落平台文档)

| #     | 任务(§6#)                                                                       | 落点                            | 状态                   |
| ----- | ------------------------------------------------------------------------------- | ------------------------------- | ---------------------- |
| T2-1  | 新产品 S2S 凭证默认 = token exchange(#5)                                        | product_200 §2.2                | 待起                   |
| T2-2  | 门控公式钦定 canonical(#6)                                                      | product_220 §3                  | 待起                   |
| T2-3  | 信封版本标号统一 v2/v3(#7)                                                      | product_200 / 220               | 待起                   |
| T2-4  | OIDC 双 client 定正典(#9)                                                       | product_200 §2.1                | 待起                   |
| T2-5  | intent 词表补 subscribe(#12)                                                    | product_200 §3.2                | 待起                   |
| T2-6  | webhook 平台侧键名惯例(#13)                                                     | product_200 §4                  | 待起                   |
| T2-7  | agent-db 口径措辞收窄=SoR 归属(#16)                                             | product_100 §2 / product_200 §7 | 待起                   |
| T2-8  | OIDC allowed_scopes 去 `{product_code}`(#20)                                    | product_200 §2.1                | 待起                   |
| T2-9  | **基建分配登记表**(#10,新建:每产品 端口/主机/stack_root/域名/namespace/tailnet) | 新文档 50-deployment            | 待起(真产品部署前必需) |
| T2-10 | §6 tracker 同步:#1/#2/#3/#4/#8 标 ✅(#85 已改标准、tracker 未标)                | product_240 §6                  | 待起(cosmetic)         |

## Tier 3 — L3 agent profile 启用(卡 L3,不卡 L2 template 基座)

| #    | 任务                                                                                         | 落点                           | 状态                          |
| ---- | -------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------- |
| T3-1 | LLM 通路裁决:发布 `@vxture/model-runtime-client` 供外部仓 **或** 给 Atlas 网关定纯 HTTP 契约 | packages/ai / product_240 §4.2 | 待 owner 裁(agent profile 前) |
| T3-2 | T3:首个 agent→Arda 的 S2S 工具协议消费场景落地                                               | bff/auth-bff + arda            | 待 owner 排期                 |

## Tier 4 — 平台能力缺口 / 安全 tech-debt(reserved,有消费方再做)

| #    | 任务                                                                           | 落点                           | 状态      |
| ---- | ------------------------------------------------------------------------------ | ------------------------------ | --------- |
| T4-1 | 成员 roster 拉取 API + per-member 失效事件(#29,v1 已裁延后)                    | platform-api / commerce        | reserved  |
| T4-2 | 成员 display 缓存失效通道(#31)                                                 | product_200 §4.2 + platform    | reserved  |
| T4-3 | 产品级 metric kind 视图/C2 下发(#30)                                           | product_220 §4 / @shared       | reserved  |
| T4-4 | webhook 双 secret 轮换机制(#19)                                                | services/commerce/provisioning | reserved  |
| T4-5 | S2S 签发审计(TD-034)                                                           | bff/auth-bff                   | tech-debt |
| T4-6 | platform router 自报 product/workspace_id 绑 token(TD-035)                     | bff/platform-api               | tech-debt |
| T4-7 | frozen 冻结态 claim 源 + switch-tenant 服务端查成员(080-rp §2.11 cutover 缺口) | bff/auth-bff                   | tech-debt |
| T4-8 | boot-smoke 护栏(#15,若上 NestJS agent-server 形态)                             | 140 §8                         | 待判      |

---

## 推进记录

- 2026-07-20 立本计划;Tier 1 起(三路调研 grounding → 逐项 PR)。
