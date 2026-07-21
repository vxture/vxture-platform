# 注册一个产品 Runbook（Register a Product）

> 目标：把一个新产品（例：`arda`）接入**平台侧**目录 + 身份 + 订阅/用量引擎。
> 本 runbook 把每一步拆成 **agent 可做**（seed / 代码改，走 PR 评审）与 **owner 手动**
> （密钥带外传递 + 活库 apply，过 `db-init` 生产审批门）两类，避免把生产写操作混进代码评审。

## 0. 范围与依据

- **只覆盖平台侧注册**。产品侧建库（`vx_provision` / `local_authz` / `local_usage` + 领域 schema）
  由产品自持，见 `docs/30-design/product_240_repo-template.md` §2.4，本 runbook 不代做。
- 依据：`product_210`（OIDC 客户端）·`product_310`（provisioning / webhook）·
  `product_320`（线下订单 / CD）·`product_220` §1–3（目录值域 / C2 信封）·
  治理标准 §6（环境部署 bootstrap，见 `docs/10-standards/140-repo-governance-standard.md`）。
- **权威 seed** = `deploy/database/seed/seed-catalog.mjs`（活跃，由 `29-seed-platform-ddl.sh` 跑）。
  `deploy/database/prisma/` 下同名文件已 **superseded**，勿改。
- 值域（`TIERS` / `SUBSCRIPTION_STATUSES` / …）权威在 `@vxture/shared`；C2/C3 信封类型在
  `@vxture/shared` ≥ 1.5.0（`entitlement.types`）。产品对齐值域，不在 seed 里私造。

## 1. 平台侧注册清单（7 件）

| #   | 组件                 | 表 / 位置                                                             | 谁做                           | 备注                                                                                                                                                                       |
| --- | -------------------- | --------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 产品目录行           | `product.products`（`PRODUCTS` 数组）                                 | agent                          | `code` / `type` / `category_id` / `product_name`(主) / `product_nick`(副) / `desc`；`on conflict (product_code) do nothing`                                                |
| 2   | 产品分类             | `product.product_categories`                                          | agent                          | 复用现有 `1=agent` / `2=platform`，新增才加行                                                                                                                              |
| 3   | OIDC 客户端          | `appoidc.oidc_clients`（`oidcClients` 数组）                          | agent（描述符）+ owner（密钥） | `redirect_uris` 由 `{CODE}_BASE_URL` 派生；`realm=customer`；`scopes`；client secret 走 `provision-secrets` 带外，**不入库明文**                                           |
| 4   | `product_id` 回填    | `appoidc.oidc_clients.product_id`                                     | 自动                           | 按 `client_id ≈ product_code` 匹配（`arda-beta` / `arda-canary` → `arda`）；平台级 client（website/console/admin/…）留 `NULL`                                              |
| 5   | Provisioning webhook | `product.product_webhooks`                                            | agent（配置）+ owner（密钥）   | `webhook_url = {WEBHOOK_BASE}/provisioning/webhook`；`webhook_secret_ref` = **env 变量名**（如 `ARDA_PROVISION_WEBHOOK_SECRET`），密钥值在 dispatcher 宿主（admin-bff）env |
| 6   | 售卖目录图           | `product.plans` / `plan_versions` / `plan_prices` / `plan_components` | agent                          | `tier` / 价格 / `quota`；C2 信封据此解析；`plan_versions.status` = `draft`\|`published`；`launch_checklist_items`（`verification_policy` + `pricing_set`）为放行门         |
| 7   | 认证策略             | `kyc.verification_policies`                                           | agent（可选）                  | 按 `product_id`；不配则继承平台默认（`product_id IS NULL` 行）                                                                                                             |

## 2. Agent 可做（在一个 PR 里）

全部落在 `deploy/database/seed/seed-catalog.mjs`，幂等（`on conflict … do nothing` / `do update`），
可安全重跑：

1. `PRODUCTS` 数组追加产品行（`{ code, type, cat, name, nick, desc }`）。
2. `oidcClients` 数组追加客户端描述符：`redirectUris` 用 `appUris(B.<code>, betaB.<code>)`（或
   `${B.<code>}/auth/callback`），`scopes` 至少 `["openid","profile","email"]`；**新契约（D12）下产品 token
   不带商业字段**，不要加 `<code>:subscription` scope（C2-only，`arda` 已退役该 scope）。
3. `product_webhooks` upsert：`webhook_url = {WEBHOOK_BASE}/provisioning/webhook`，
   `webhook_secret_ref` 填 env 变量名（不填值）。
4. `plans` / `plan_versions` / `plan_prices` / `plan_components` 售卖图 + `product_metrics`
   （每 metric 的 `merge_strategy` / `kind`——决定信封 `limits`（`max` 键）与 `quota_pools`（池键）形态）
   - `launch_checklist` 门。
5. `kyc.verification_policies`（可选）。
6. 在 `B` / `betaB` map 里加 `{CODE}_BASE_URL` / `{CODE}_BETA_BASE_URL` 的**引用**（env 名，
   本地默认回落 `localhost:<port>`）。**只写 env 名，不写生产值。**
7. **档位在线验证 fixtures（template 批3「档位在线联测」所需）**：为演示 workspace 造一条
   `metering.subscriptions`（选一档位、`status='active'`）+ 对应 `metering.quota_pools`，使 C2 信封对该 ws
   返回真实 `tier` / `status` / `limits` / 池；五档全覆盖则每档一条（含 `trialing`/`overdue` 等状态样本）。
   **仅落 `seed-demo-data` 面（非目录主 seed）**，活库注入经 `seed-demo-data.yml`、同属 owner-gated（§3）。
   缺此则只验得了"未订阅=null"分支,验不了档位门控与 quota 消耗。

> 值域不够用时（新 tier 等）：**先改 `@vxture/shared`**（权威）→ 发版 → 再在 seed 引用，
> 不在 seed 里硬编码域外值。
>
> 备注：产品描述符目前是 seed 里的**内联数组**（`PRODUCTS` / `oidcClients`）。把它们外置成
> 声明式清单是一个可选改进，属 owner 决策范围，本 runbook 不预做。

## 3. Owner 手动（带外传递 + 过审批门）

这些是**生产写 / 密钥操作**，agent 只触发不自审（见 [[feedback_production_approval_gate]]）：

1. **Client secret 带外传递**到产品宿主：`db-init` `action=provision-secrets`
   （27-provision → 29-seed → 重建 RP bff）。secret 不入库明文；迁仓 secrets 不继承（§6）。
2. 宿主 env 设：`{CODE}_PROVISION_WEBHOOK_SECRET`（webhook HMAC 校验）、
   `PLATFORM_INTERNAL_AUTH_TOKEN`（产品→平台 S2S，产品侧键名可不同，如 arda 用
   `PLATFORM_INTERNAL_AUTH_TOKEN`）。
3. GitHub Environment secrets/vars 设：`{CODE}_BASE_URL`（**公网**，派生 `redirect_uris`）、
   `{CODE}_WEBHOOK_BASE_URL`（**tailnet** 投递，与公网 base 解耦；未设则回落公网 base）。
4. 跑 `db-init`（`action=seed` 或 `provision-secrets`）——**production 审批门**，
   owner 在 GitHub 点击批准。**reseed 前知会 operation**：目录 / 可见性变更即时生效。

## 4. 验收（活库跑完 seed 后）

```sql
-- 1. 目录行在、active
select product_code, product_type, status from product.products where product_code = '<code>';
-- 2. OIDC client product_id 已回填（非 null）
select client_id, product_id from appoidc.oidc_clients where client_id like '<code>%';
-- 3. webhook 配置正确
select home_url, webhook_url, webhook_secret_ref from product.product_webhooks
  where product_id = (select id from product.products where product_code = '<code>');
```

- **C2 探针**：`GET` platform-api `/entitlements?workspace_id=<ws>&product=<code>` 返回信封——
  未订阅 ws → `status:null` / `tier:null` / 空 `limits`+`quota_pools`（§11.4）；**有演示订阅的 ws
  （item 7 fixtures）→ 真实 `tier` / `status:active` / `limits` 数字 / 池**（这才验到档位在线门控与 quota）。
- 产品侧 OIDC 登录闭环；provisioning webhook 实测 `delivered` / `200`。
- `launch_checklist` 两门（`verification_policy` / `pricing_set`）满足才算可售。

## 5. 关联

- [[feedback_production_approval_gate]] — 生产 DB / 部署写操作 owner 审批门。
- [[reference_shared_value_domains]] — 值域唯一权威在 `@vxture/shared`。
- [[project_product320_subscription_flow]] — 订阅业务全路径 + 镜像/容器命名前缀。
- [[reference_repo_governance_standard]] §6 — 环境部署 bootstrap（Environment / Required reviewers / DEPLOY_DIR）。
- `docs/30-design/product_240_repo-template.md` §2.4 — 产品侧数据契约（`vx_provision` / `local_authz` / `local_usage`）。
