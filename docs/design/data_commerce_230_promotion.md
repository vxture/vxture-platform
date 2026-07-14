# Commerce 域细化设计：promotion（卡券：批次 / 码 / 核销，五型统一）

<!-- data-architecture: target-state -->

> 状态：v1 草案 · 编号 `data_commerce_230`（细化设计层）· 待评审 · 未实施
> 上级权威：[`data_platform_100_architecture.md`](data_platform_100_architecture.md) §2.2.4 八条铁律
> 姊妹文件：[`data_commerce_200_metering.md`](data_commerce_200_metering.md) / [`data_commerce_210_billing.md`](data_commerce_210_billing.md) / [`data_commerce_220_provisioning.md`](data_commerce_220_provisioning.md)
> 取代范围：**取代** `data_commerce_210_billing.md` 早期 §7.1 `coupons` 单表设计（已升级为本三表结构，billing 留指针）。

---

## 0. 定位与关键设计决策

卡券的三段生命周期——**批量发码 → 定向发放 → 核销追溯**——分三表，避免单表把批次配置冗余到每个码：

| 表                    | 职责                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `voucher_batches`     | 批次模板：一次营销活动/一批卡的配置（kind、effect、总量、有效期） |
| `vouchers`            | 码实例：每个可核销的码（状态、定向发放目标、max_uses）            |
| `voucher_redemptions` | 核销记录：每次核销一行，落效果追溯                                |

**关键决策：**

- **kind 专属参数走 `effect` JSONB（批次上）+ 核销时快照**：5 种 kind 参数结构差异大，拆列会产生大量 NULL；`effect_snapshot` 防批次改配置后追溯失真。
- **效果追溯用显式外键列（非 JSONB）**：`transaction_id` / `subscription_id` / `invoice_item_id` / `payment_id` 需 JOIN 与外键约束——按**铁律一**建**真跨 schema FK**（指向 billing/metering），不埋 JSONB。
- **kind / status 一律 `VARCHAR + CHECK`**（§3.2.2 禁 PG ENUM；Prisma 侧亦**不用 native enum**，用字符串映射）。
- **discount 可复用**：`vouchers.max_uses`（折扣券可 >1），`voucher_redemptions` 不加 UNIQUE；其余 kind `max_uses=1` 收敛。
- **金额单位**：`effect` JSONB 内金额用整数**分（cents）**（配置值，免浮点）；**落账一律转 `NUMERIC(12,2)` 元入 `billing.transactions`**（真账本）。

五型：`credit_voucher`(代金券,赠额入余额) / `recharge_card`(充值卡,实付入余额) / `redemption`(兑换码,激活订阅) / `discount`(折扣券,购买减价) / `extension`(展期券,延长订阅)。

---

## 1. `voucher_batches`（批次模板）

| 字段                         | 类型         | 约束                                                                        | 说明                                                                          |
| ---------------------------- | ------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `id`                         | uuid         | PK                                                                          |                                                                               |
| `tenant_id`                  | uuid         | NULL, FK→`tenancy.tenants.id`                                               | NULL=平台级；定向租户批次则限定                                               |
| `kind`                       | varchar(20)  | NOT NULL, CHECK(credit_voucher/recharge_card/redemption/discount/extension) |                                                                               |
| `name`                       | varchar(128) | NOT NULL                                                                    | 如"2026 新春代金券"                                                           |
| `code_prefix`                | varchar(16)  | NULL                                                                        | 生成码前缀，如 `VX26-`                                                        |
| `effect`                     | jsonb        | NOT NULL                                                                    | kind 专属参数（§4 约定）                                                      |
| `total_count`                | int          | NOT NULL                                                                    | 计划发行量                                                                    |
| `issued_count`               | int          | NOT NULL DEFAULT 0                                                          | 已发码数                                                                      |
| `per_user_limit`             | int          | NOT NULL DEFAULT 1                                                          | 每用户领取上限                                                                |
| `valid_from` / `valid_until` | timestamptz  | NOT NULL                                                                    | 批次有效期                                                                    |
| `status`                     | varchar(16)  | NOT NULL DEFAULT `'active'`, CHECK(active/paused/archived)                  |                                                                               |
| `created_by`                 | uuid         | NULL                                                                        | 运营专属操作，realm 确定=operator（边界#2，逻辑引用 admin.operator_accounts） |
| `created_at` / `updated_at`  | timestamptz  | NOT NULL DEFAULT now()                                                      |                                                                               |

索引：`idx_voucher_batches_tenant_kind_status (tenant_id, kind, status)`。

## 2. `vouchers`（码实例）

| 字段                    | 类型        | 约束                                                                                  | 说明                                                                             |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `id`                    | uuid        | PK                                                                                    |                                                                                  |
| `batch_id`              | uuid        | NOT NULL, FK→`voucher_batches.id`                                                     |                                                                                  |
| `code`                  | varchar(64) | UNIQUE NOT NULL                                                                       | **可视码**（归一化大写存储，去混淆字符）；核销按 code 查，非 FK 关联键（铁律二） |
| `status`                | varchar(16) | NOT NULL DEFAULT `'issued'`, CHECK(issued/assigned/reserved/redeemed/expired/revoked) | 见 §7 状态机                                                                     |
| `max_uses`              | int         | NOT NULL DEFAULT 1                                                                    | discount 可 >1                                                                   |
| `used_count`            | int         | NOT NULL DEFAULT 0                                                                    |                                                                                  |
| `assigned_workspace_id` | uuid        | NULL, FK→`tenancy.workspaces.id`                                                      | 定向发放目标                                                                     |
| `assigned_user_id`      | uuid        | NULL, FK→`account.users.id`                                                           | 定向发放目标                                                                     |
| `expires_at`            | timestamptz | NULL                                                                                  | 可覆盖批次有效期                                                                 |
| `redeemed_at`           | timestamptz | NULL                                                                                  | 末次核销时间                                                                     |
| `created_at`            | timestamptz | NOT NULL DEFAULT now()                                                                |                                                                                  |

索引：`idx_vouchers_batch_status (batch_id, status)`、`idx_vouchers_assigned_ws (assigned_workspace_id)`。`code` 唯一索引即核销查询入口，无需模糊匹配。

## 3. `voucher_redemptions`（核销记录，效果追溯）

| 字段                                                          | 类型        | 约束                                 | 说明                                                   |
| ------------------------------------------------------------- | ----------- | ------------------------------------ | ------------------------------------------------------ |
| `id`                                                          | uuid        | PK                                   |                                                        |
| `voucher_id`                                                  | uuid        | NOT NULL, FK→`vouchers.id`           |                                                        |
| `tenant_id`                                                   | uuid        | NOT NULL, FK→`tenancy.tenants.id`    | 核销侧强制归属                                         |
| `workspace_id`                                                | uuid        | NOT NULL, FK→`tenancy.workspaces.id` |                                                        |
| `user_id`                                                     | uuid        | NOT NULL, FK→`account.users.id`      | 核销人（客户 realm 确定）                              |
| `kind`                                                        | varchar(20) | NOT NULL                             | 冗余，避免查询三级 JOIN                                |
| `effect_snapshot`                                             | jsonb       | NOT NULL                             | 核销时刻的 `effect` 快照（防批次后续改配置致追溯失真） |
| **效果追溯（按 kind 填对应列，其余 NULL；均真跨 schema FK）** |             |                                      |                                                        |
| `transaction_id`                                              | uuid        | NULL, FK→`billing.transactions.id`   | credit_voucher(grant) / recharge_card(recharge)        |
| `subscription_id`                                             | uuid        | NULL, FK→`metering.subscriptions.id` | redemption(新建) / extension(被延长的订阅)             |
| `invoice_item_id`                                             | uuid        | NULL, FK→`billing.invoice_items.id`  | discount 挂靠的账单项                                  |
| `payment_id`                                                  | uuid        | NULL, FK→`billing.payments.id`       | redemption 线下 payment 追溯                           |
| `redeemed_at`                                                 | timestamptz | NOT NULL DEFAULT now()               |                                                        |

索引：`idx_voucher_redemptions_tenant_ws (tenant_id, workspace_id)`、`idx_voucher_redemptions_voucher (voucher_id)`。**不加 UNIQUE(voucher_id)**——discount 复用可多次核销。

---

## 4. `effect` JSONB 各 kind 约定（服务层按 kind 校验，如 zod）

```jsonc
// credit_voucher（代金券：赠额入余额）
{ "amount_cents": 5000, "currency": "CNY", "credit_expires_in_days": 90 }

// recharge_card（充值卡：实付面值入余额）
{ "face_value_cents": 10000, "bonus_cents": 0 }   // 可留 bonus 扩展

// redemption（兑换码：直接激活订阅）
{ "plan_id": "...", "plan_version_id": "...", "duration_days": 365,
  "offline_payment_required": true }              // 核销时要求补录 payment_id

// discount（折扣券：购买时减价，结合等级）
{ "discount_type": "percent"|"fixed", "value": 20, "max_off_cents": 5000,
  "applicable_plan_ids": ["..."], "min_user_level": 4 }   // 等级门槛见 §6

// extension（展期券：延长订阅 end_at）
{ "extend_days": 30, "applicable_product_codes": ["arda"] }
```

> 金额一律整数分；`plan_version_id` 等在 JSONB 内是**配置引用**（核销时用于建订阅），非 FK 列——真正的效果结果落 §3 的显式 FK 列。

---

## 5. 三个实现要点

1. **discount 的 `reserved` 中间态**：挂到未支付 invoice 时先 `assigned→reserved` 锁定并占 `used_count`；invoice 支付成功 → 落 `voucher_redemptions`、回填 `invoice_item_id`（`used_count` 已在 reserve 时占用，此处**不再自增**）；**仅当 `used_count` 达 `max_uses` 才 status→`redeemed`（终态），否则回 `assigned` 供复用**（修正：max_uses>1 的折扣券首次核销后不得过早置终态）；invoice 作废 → 释放回 `assigned`、退 `used_count`。其余四型 `max_uses=1`，**核销即终态**，无此中间态。
2. **核销原子性**：`UPDATE vouchers SET used_count=used_count+1 WHERE id=? AND used_count<max_uses AND status IN (...)` + `INSERT voucher_redemptions` + 效果写入（transaction/subscription/…）**同一事务**；以**受影响行数=1** 判抢占成功，防并发重复核销。
3. **code 归一化**：生成时去混淆字符（0/O、1/I）、统一大写；核销入口按归一化后查 `@unique(code)`，无需模糊匹配。

> **entitlement 追溯**：若 redemption 激活订阅需落 `metering.subscription_entitlement_overrides`，在 `effect_snapshot` 里同时快照核销时解析出的 grant 集合，追溯不依赖 `plan_version` 后续变更。

---

## 6. 等级联动（折扣券 × 用户等级）

- **券侧门槛**：discount 的 `effect.min_user_level` —— 仅 ≥ 该等级可领/用。
- **等级自带折扣**：`identity` 域 `loyalty.level_policies.base_discount_percent`（等级固有折扣，如 L4=95 折）。折扣券与等级折扣按批次 `effect` 的叠加规则（stack/取优）在应用层校验。等级既**门控**券、又**自带**折扣，与卡券打通。

---

## 7. 状态机

- **批次** `voucher_batches.status`：`active → paused → active`；`* → archived`。
- **码** `vouchers.status`：`issued`(已生成未发放) `→ assigned`(定向发放) `→ reserved`(discount 挂未支付 invoice) `→ redeemed`(达 max_uses)；**`reserved → assigned`**(invoice 作废释放，退 used_count，与 §5.1 对齐)；`issued/assigned → expired`；`* → revoked`。非 discount：`assigned/issued → redeemed` 直接终态。

---

## 8. 可视码

| 码                         | 模式                        | 示例          |
| -------------------------- | --------------------------- | ------------- |
| `vouchers.code`            | `{code_prefix}{归一化随机}` | `VX26-9F3ATC` |
| `voucher_batches` 无对外码 | —                           | 内部 uuid     |

（遵铁律二：`code` 仅核销查询/展示，非关联键；表间关联走 uuid FK。）

---

## 9. 跨 schema FK 速查表

| 从                                                                   | 到                           | 类型              | 依据                           |
| -------------------------------------------------------------------- | ---------------------------- | ----------------- | ------------------------------ |
| `voucher_batches.tenant_id`、`voucher_redemptions.tenant_id`         | `tenancy.tenants.id`         | 真 FK             | 普通引用                       |
| `vouchers.assigned_workspace_id`、`voucher_redemptions.workspace_id` | `tenancy.workspaces.id`      | 真 FK             | 普通引用                       |
| `vouchers.assigned_user_id`、`voucher_redemptions.user_id`           | `account.users.id`           | 真 FK             | 普通引用（客户 realm）         |
| `vouchers.batch_id`                                                  | `voucher_batches.id`         | 真 FK             | 同 schema                      |
| `voucher_redemptions.voucher_id`                                     | `vouchers.id`                | 真 FK             | 同 schema                      |
| `voucher_redemptions.transaction_id`                                 | `billing.transactions.id`    | 真 FK             | 效果追溯（铁律一）             |
| `voucher_redemptions.subscription_id`                                | `metering.subscriptions.id`  | 真 FK             | 效果追溯                       |
| `voucher_redemptions.invoice_item_id`                                | `billing.invoice_items.id`   | 真 FK             | 效果追溯                       |
| `voucher_redemptions.payment_id`                                     | `billing.payments.id`        | 真 FK             | 效果追溯                       |
| `voucher_batches.created_by`                                         | `admin.operator_accounts.id` | **裸值**，不建 FK | 边界#2（运营专属，realm 确定） |

---

## 10. 待办 / 开放项

- 卡券五型核销引擎、discount 两阶段(reserved)、并发原子性核销为**实施逻辑**，本文只备数据结构（业务陆续实现）。
- `effect` JSONB 各 kind 的服务层校验 schema（zod）由实施文档定。
- 迁移步骤由 `data_commerce_3**` 实施文档另定。
