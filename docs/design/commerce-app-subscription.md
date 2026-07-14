# Commerce · per-app 订阅与 EntitlementProvider（commerce 邻域）

> 🧭 平台数据模型权威 = [data_platform_100_architecture.md](data_platform_100_architecture.md) + [-schema.md](data_platform_200_schema.md)（本文不重述平台 DDL，只述本板块内容）。

> **commerce 邻域文档**（原 `identity-sso-p0.5-commerce`，已移出 identity 板块）：per-app 订阅（按应用订阅，B5 + D-1/D-2/D-5）+ 为 identity IdP（[`identity-platform-idp.md`](identity-platform-idp.md) §6.1 `EntitlementProvider` 接缝）提供真实实现。字段级见 b §commerce/§product。
> 版本：v1.0（2026-06-10）。状态：详细设计，未编码。

---

## 0. 范围与 taxonomy 决议

**taxonomy（已定）**：新立 `product.application` 一等实体 = 可售卖业务 app（ruyin / xuanzhen / hermes / …）。`console/website/admin` 是平台界面、**非** application（无订阅，`oidc_client.product_ref` 为空）。

**做**：`product.application` 实体；`plan` 归属 application；`tenant_subscription`/`quota` 改为 per (tenant, application)；`past_due` 状态机（D-2）；`EntitlementProvider` 实现；provisioning 状态/投递日志表（D-5）。

**不做**：RP 实际接入（P1+）；webhook 投递的真正触发（P4 消费，本轮只定表 + 契约）。

---

## 1. taxonomy 落地（实体关系）

```
product.application  (ruyin / xuanzhen / hermes …)     ← oidc_client.product_ref → application.app_code
        │ 1:N
   product.plan      (ruyin-free / ruyin-pro / xuanzhen-free …)   ← plan 归属唯一 application
        │ N:M（既有关联表，不变）
        ├─ plan_agent     → product.agent      (varda / 行业 agent …，plan 内授予的子资源)
        ├─ plan_feature   → product.feature    (+ quota_value)
        ├─ plan_price     → 定价（周期/币种）
        └─ plan_capability(iam) → iam.capability

commerce.tenant_subscription   per (tenant, application)   ← 一租户对每个用到的 app 各一份
        └─ tenant_subscription_quota  per subscription      ← 不再租户 1:1
```

要点：

- **`agent` 不升格为 app**——它仍是 plan 内授予的子资源；app 的"超级智能体/仿真"等业务概念在各 app 自有库,平台只管 application 这层售卖单元。
- **plan 从全局改为归属 app**：`ruyin` 的 `free/pro` 与 `xuanzhen` 的 `free/pro` 各自独立。
- `oidc_client.product_ref` 仅 business app 有值;平台界面(console/website/admin)为空 → entitlement 不适用(恒可用)。

---

## 2. Schema 增量（引用）

本板块涉及的表/字段/索引/触发器均以**字段级权威**为准，本文不再重述 DDL：

- 平台数据模型（product / commerce 各表字段级）见 **[-schema.md](data_platform_200_schema.md)**（字段级权威），各域概览见 **[data_platform_100_architecture.md](data_platform_100_architecture.md) §3.4**。
- 迁移（建表 / 改键 / 部分唯一索引落地）见 **[data_platform_300_migration.md](data_platform_300_migration.md)**（已落地）。

本轮 P0.5 涉及的模型对象（细节见 schema 权威）：

- `product.application` —— 新增一等实体（`app_code` = `oidc_client.product_ref`）。
- `product.plan` —— 增 `application_id`；唯一约束由全局 `plan_code` 改为 `(application_id, plan_code)` 复合唯一。
- `commerce.tenant_subscription` —— 增 `application_id`；`status` 取值集纳入 **`past_due`**（D-2，见 §3）；`(tenant, application)` 唯一活跃订阅由部分唯一索引（`deleted_at IS NULL AND status IN (trial,active,past_due)`）兜底。
- `commerce.tenant_subscription_quota` —— 去租户 1:1，改为 per subscription（`subscription_id` 唯一 + 冗余 `application_id`）。该表由 **gateway 管理**（`services/ai/gateway` schema），改键须跨 schema 协调（见 §7）。
- `commerce.tenant_app_provisioning` —— 新增，D-5 业务开通状态（pending | provisioned | deprovisioned）。
- `commerce.app_webhook_delivery` —— 新增，D-5 投递日志（P4 消费）；签名（HMAC）、at-least-once + 重试、app 侧按 `tenant_id+application_id` 幂等的投递器在 **P4** 实现，本轮只固化表与事件契约。

---

## 3. 订阅状态机（D-2）

```
              ┌──────── trial ───────┐
              ▼                       ▼
   (开通) → active ⇄ past_due ──(宽限超时)──→ expired
              │  ▲        │
        (取消)│  │(补缴)   │(欠费)
              ▼  └─────────┘
          cancelled                   suspended（运营冻结）
```

| subscription.status | 含义         | → token `entitlement.status` | app 行为                                        |
| ------------------- | ------------ | ---------------------------- | ----------------------------------------------- |
| `trial`             | 试用中       | `trial`                      | 正常（试用额度）                                |
| `active`            | 正常付费     | `active`                     | 正常                                            |
| `past_due`          | 欠费宽限     | `past_due`                   | 只读/限用（宽限内仍可登录使用，超时转 expired） |
| `suspended`         | 运营冻结订阅 | `canceled`                   | 拒（运营干预）                                  |
| `cancelled`         | 用户取消     | `canceled`                   | 到期前可用，到期转 expired                      |
| `expired`           | 已过期       | `expired`                    | 拒,跳订阅页                                     |

> **区分两个"冻结"**：上表是**订阅级**（entitlement）;`tenant.status=suspended → token active_tenant_status=frozen` 是**账号/租户级**（只读降级），两者独立（见主设计 §6.2 / §8）。

---

## 4. `EntitlementProvider` 实现（替换 P0 stub）

```ts
// P0 接口不变（identity-platform-idp.md §6.4）；P0.5 提供真实实现
async resolve(tenantId: string, productRef: string) {
  // 1. productRef（= oidc_client.product_ref）→ application
  const app = await productApplication.findActiveByCode(productRef);
  if (!app) return null;                       // 该 client 非可售 app（console 等）→ 无 entitlement

  // 2. 直读 (tenant, application) 的活跃订阅
  const sub = await tenantSubscription.findActive(tenantId, app.id);
  //   WHERE tenant_id=? AND application_id=? AND deleted_at IS NULL
  //         AND status IN ('trial','active','past_due')  ORDER BY created_at DESC LIMIT 1
  if (!sub) return null;                        // 未订阅/未开通 → app 跳订阅页

  // 3. plan + 状态映射（§3）
  const plan = await productPlan.findById(sub.planId);
  return {
    plan: plan.planCode,                        // 或 planType，按 token 约定
    status: mapStatus(sub.status),              // §3 映射；suspended→canceled
    expires_at: epoch(sub.endAt ?? sub.trialEndAt) ?? null, // null=永久
  };
}
```

- `resolve` 返回 `null` 的两种语义都让 app 走"未开通"路径(跳订阅页):**非可售 app** 与 **未订阅**。前者实际不该有 product_ref,故正常不会查询。
- 端点/claims 与 P0 完全一致,**仅此实现替换**;P0 期的 stub 下线。

---

## 5. 迁移思路 / 数据决策

> 建表 / 改键 / 部分唯一索引等 DDL 落地步骤见 **[data_platform_300_migration.md](data_platform_300_migration.md)**（已落地）。此处仅保留本板块的迁移策略与数据决策。

- **整体策略**：现网商业数据极少（seed 级：仅 free 套餐 + zhangsan 个人租户），故倾向**清晰重建**而非复杂回填。
- **M-1 数据决策**：现有全局 free 套餐——重建为各 app 的 free 计划（seed 重写）而非挂靠单一 app（数据少,重建最干净）。若未来有存量付费订阅,需正式回填脚本。
- **status 取值集**：`tenant_subscription.status` 纳入 `past_due`（应用层 + 文档约束,无 enum 改动）。
- **seed**：统一 `seed.mjs` 幂等补登 application（`ruyin` / `xuanzhen` / `hermes`，app_code = 对应 `oidc_client.product_ref`）+ per-app plan + 示例订阅。
- **切换 `EntitlementProvider`** 实现（P0 stub → §4 真实读）;P1+ RP 才真正消费 entitlement 硬门控。

---

## 6. 验收标准（P0.5）

- 同租户对 ruyin、xuanzhen **各持独立订阅**,可 ruyin=pro 且 xuanzhen=free,互不影响。
- `(tenant, application)` 只允许一份活跃订阅（部分唯一索引生效:重复插入活跃订阅被拒）。
- `EntitlementProvider.resolve` 对 (tenant, ruyin) 与 (tenant, xuanzhen) 返回**各自**的 plan/status/expires;非可售 app（product_ref 空）返回 null。
- `past_due` 全链路:订阅置 past_due → token `entitlement.status=past_due` → app 进只读/限用;超时转 expired → 跳订阅页。
- plan 复合唯一:`ruyin/free` 与 `xuanzhen/free` 可共存。
- quota 改键后,gateway 配额检查按 (tenant, app)/订阅 命中正确快照。

---

## 7. 风险 / 接触面

- **gateway schema 协调**：`tenant_subscription_quota`（及 usage_event/summary）由 gateway 管理,改键须与 gateway 侧 Prisma + 配额检查逻辑同步（usage 已按 `applicationId` 记,改动小;quota 主键变更是重点）。
- **M-1 旧计划归属**：现网平台级计划在 per-app 模型下需归属到 app;鉴于数据极少,采用 seed 重建（已选）。若未来有存量付费订阅,需正式回填脚本。
- **应用层不变量**：`(tenant, application)` 单活跃订阅由部分唯一索引兜底,应用层切换/升降级须走"旧订阅置非活跃 + 新订阅活跃"事务。
- **与 P0 的接缝**：仅替换 `EntitlementProvider` 实现,P0 端点/claims/会话模型零改动。
- **provisioning 投递**：P0.5 只固化表 + 事件契约;真正投递器、重试、幂等在 **P4**（xuanzhen 接入）落地。
