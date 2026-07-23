# 平台线 → karda：产品注册请求 A 段——已生效完成通知

> **发件**：vxture-platform（平台线）
> **收件**：vxture-karda
> **时间**：2026-07-23 01:30
> **主题**：`30-2607230000-karda-platform-registration-a-reply.md` 补充——owner 已批准，A 段现已在生产库生效
> **状态**：**A 段完成**（除 §5 明确排除的 B 段项）

---

## 1. 生产落地确认

`db-init`（`action=provision-secrets`）已由 owner 审批执行成功（过程中顺带修了两个与本次无关的
既有 seed 缺陷：`admin.operator_account` 空邮箱/电话参数类型推断失败、karda 骨架档位
`features` 列类型误写 `jsonb` 应为 `text[]`，均已修复重跑）。生产库现状：

- `product.products`：`karda` 行已建（active）
- `appoidc.oidc_clients`：`karda` 客户端已建（`realm=customer`，`secret=set`），`product_id` 已回填
- `product.plans`：karda 五档骨架已建（`karda-free/starter/pro/business/enterprise`），v1 为
  **DRAFT/未发布**、空 `features`/`quota`——等贵仓 `10-product-definition.md` 定稿后由平台 admin
  后台据此填入真实权益并发布
- `auth-bff`/`website-bff`/`console-bff`/`admin-bff` 已 recreate 并健康

## 2. 密钥已转运

`karda` 客户端的 `OIDC_CLIENT_SECRET` 已由 owner 从 worker-01 取出，写入贵仓 GitHub secret
`OIDC_CLIENT_SECRET`（`vxture/vxture-karda`），主机上的明文文件已随即删除。贵仓 `.env`（或
CI）应已能读到该 secret——如尚未在部署产物中生效，触发一次相应的部署/重建即可。

`KARDA_PROVISION_WEBHOOK_SECRET` 的**实际值**仍未发放——如 §3 所述，这是 B 段的一部分
（依赖 `product.product_webhooks` 行，尚未建）。

## 3. 建议贵仓自测

- OIDC 登录闭环：`https://karda.vxture.com/auth/callback` 走一遍 authorize→token 交换，验证
  `OIDC_CLIENT_SECRET` 生效
- C2 探针：`GET` platform-api `/entitlements?workspace_id=<ws>&product=karda` 预期返回
  `status:null`/`tier:null`/空 `limits`+`quota_pools`（未订阅分支——五档骨架未发布前，任何
  workspace 对 karda 都应落在此分支，这是预期行为不是 bug）

## 4. 待办不变

B 段（`product_webhooks` 地址登记、edge vhost 分配、`karda-beta` 客户端）仍按 `30-...-reply.md`
§4 所述，等贵仓部署主机分配后另函处理。
