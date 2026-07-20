# Safety 域细化设计：内容审核（结构占位）

<!-- data-architecture: target-state -->

> 状态：v1 草案 · 编号 `data_safety_200`（细化设计层）· 待评审 · 未实施
> 上级权威：[`data_platform_100_architecture.md`](./data_platform_100_architecture.md) §2.2.4 八条铁律
> 取代范围：**取代** [`data_platform_200_schema.md`](./data_platform_200_schema.md) §13（safety 域）字段级内容。

---

## 0. 定位

内容审核**结构占位**：只建策略与日志表，不接真实审核执行逻辑（起步阶段最小化）。2 表，plural 命名。

## 1. `moderation_policies`（审核策略）

| 字段                        | 类型        | 约束                          | 说明                                                                   |
| --------------------------- | ----------- | ----------------------------- | ---------------------------------------------------------------------- |
| `id`                        | uuid        | PK                            |                                                                        |
| `tenant_id`                 | uuid        | NULL, FK→`tenancy.tenants.id` | **NULL=平台默认策略**；租户行覆盖默认。本次按铁律一建真 FK（nullable） |
| `rules`                     | jsonb       | NOT NULL DEFAULT `'{}'`       | 审核规则配置                                                           |
| `is_active`                 | boolean     | NOT NULL DEFAULT false        | **占位阶段默认不启用**                                                 |
| `created_by`                | uuid        | NULL                          | 运营专属（边界#2）                                                     |
| `created_at` / `updated_at` | timestamptz | NOT NULL DEFAULT now()        |                                                                        |

## 2. `moderation_logs`（审核记录，append-only）

| 字段         | 类型         | 约束                             | 说明                                                                             |
| ------------ | ------------ | -------------------------------- | -------------------------------------------------------------------------------- |
| `id`         | uuid         | PK                               |                                                                                  |
| `request_id` | varchar(128) | NULL                             | **跨库/跨域关联键**（串 reqlog ↔ metering.usage_events ↔ 本表）；边界#1，不建 FK |
| `direction`  | varchar(16)  | NOT NULL, CHECK(input/output)    | 输入/输出方向                                                                    |
| `result`     | varchar(32)  | NOT NULL DEFAULT `'not_checked'` | **默认 not_checked**：区分"没查过" vs "查过通过"，勿混用                         |
| `detail`     | jsonb        | NULL                             |                                                                                  |
| `created_at` | timestamptz  | NOT NULL DEFAULT now()           |                                                                                  |

## 3. 边界说明

- `moderation_policies.tenant_id` → `tenancy.tenants` 真 FK（普通引用，铁律一）。
- `moderation_logs.request_id` 是 §17 单一跨库关联键（边界#1，不建 FK）。
- 仅结构占位，审核执行逻辑不实现（业务陆续接）。
