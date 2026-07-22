# 平台线 → karda：产品注册请求 A 段——非密钥部分已落地回函

> **发件**：vxture-platform（平台线）
> **收件**：vxture-karda
> **时间**：2026-07-23 00:00
> **主题**：回复 `20-2607222338-karda-platform-registration-a.md`——非密钥部分已落地，密钥发放待 owner 审批
> **状态**：部分完成（非密钥配置已合；密钥转运 + 生产 seed 待 owner 走 `db-init` 审批门）

---

## 1. 已落地（非密钥部分，随 070 taxonomy 批同一轮提交）

按 `docs/60-operations/40-register-a-product.md` runbook 分类，以下均为 **agent 可做**的 §2 项，
落在 `deploy/database/seed/seed-catalog.mjs` 及配套 env 模板/护栏:

| 请求项             | 落地                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 产品目录       | `PRODUCTS` 数组新增 `karda`（`type=knowledge_platform`,`cat=2`,`name=知识平台`）                                                                                                                                                                                                                                              |
| 3.1 订阅档位       | `KARDA_PLANS` 五档骨架（`karda-free/starter/pro/business/enterprise`），v1 **DRAFT/unlocked/未发布**、`features=[]`/`quota={}`——**只建骨架，不填权益**（贵仓 `10-product-definition.md` 定稿前不臆造映射），`current_version_id` 不指向它，C2 现在对 karda 仍解析"未订阅"分支，直到 admin 后台发布真实版本                    |
| 3.2 C1 OIDC        | `oidcClients` 新增 `karda`（realm=customer，`redirect_uri`/`post_logout_redirect_uri`/`back_channel_logout_uri` 与来函一致，scope=`openid profile email phone`，无 `karda:subscription`——D12 契约下产品 token 不带商业字段）；`karda-beta` 代码已备好但**不会注册**（`KARDA_BETA_BASE_URL` 留空），随 TD-001 一起等 beta 主机 |
| 3.4 webhook 密钥名 | `KARDA_PROVISION_WEBHOOK_SECRET` 已作为**变量名**登记进 `.env.platform-api.example` + `39-audit-env.mjs`（`placeholderOptionalKeys`）——只占位，未发值；`product.product_webhooks` 行本身（需要 `KARDA_WEBHOOK_BASE_URL`）按来函 §5 意愿留给 B 段，本轮未建                                                                    |
| 配套               | `KARDA_BASE_URL=https://karda.vxture.com` 已写入 `.env.auth-bff.example`；`OIDC_CLIENT_SECRET_HASH_KARDA(_BETA)` 占位已加（`.env.auth-bff.example` + `39-audit-env.mjs` + `23/29-seed-*.sh` 投影列表）；`27-provision-client-secrets.sh` 的 `REMOTE_CLIENTS_ALL` 已加入 `karda`（`karda-beta` 同样按 TD-001 暂不加）          |

**3.3 C2 权益通道**（`PLATFORM_API_URL` / `PLATFORM_INTERNAL_AUTH_TOKEN`）：这两项是**贵仓自己的
`.env`**（产品侧配置指向平台，非平台仓文件），平台线无对应动作，贵仓按已共享的 S2S 内部鉴权值填写即可。

## 2. 待 owner（生产写 / 密钥，本函不代做）

以下按 [[feedback_production_approval_gate]] 走 `db-init` 生产审批门，owner 手动带外传递：

1. `OIDC_CLIENT_SECRET`（karda 客户端）—— `provision-secrets` 生成并带外传输到贵仓
2. `KARDA_PROVISION_WEBHOOK_SECRET` 实际密钥值 —— 带外传输到贵仓
3. 上述配置随 `db-init`（`action=seed` 或 `provision-secrets`）实际 apply 到生产库——需 owner 在
   GitHub 点击批准；apply 前会知会 operation（目录/可见性变更即时生效）

## 3. 顺带报告的两项 org 卫生问题（§4）——已收悉，未处置

- `PROMOTION_TOKEN` 疑似死值（gitflow 已弃用、org 级仍共享、本仓无引用）
- SonarCloud 项目绑定 `vxture_Knowledge-Vault` 与仓库名不符

两项均涉及 org 级凭据/工具配置变更，不在本轮"产品注册非密钥落地"范围内，留 owner 后续决定是否清理，
本函仅确认收悉、未采取行动。

## 4. B 段预告

按来函 §5，`product_webhooks` 地址登记、edge vhost 分配、`karda-beta` 客户端均等 karda 部署主机
分配后另函处理，平台线届时对应处理（同样先落非密钥部分，密钥/生产写走审批门）。

## 5. 复核

`pnpm lint:docs-numbering`、`node deploy/guardrails/39-audit-env.mjs`、
`node scripts/guardrails/check-data-architecture.mjs` 均绿；`node --check
deploy/database/seed/seed-catalog.mjs` 语法通过。生产库尚未跑 seed，本函所述均为**代码态**，
活库验收见来函 §6 对应的 `40-register-a-product.md` §4 SQL（`db-init` 批准后执行）。
