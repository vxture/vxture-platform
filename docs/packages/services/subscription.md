# @vxture/service-subscription

> ⚠️ 待大版本重构 | 迁移自 `services/commerce/subscription/AGENTS.md`
> 架构层参考：[`docs/architecture/04-service-layer.md`](../../architecture/04-service-layer.md)

---

## 包信息

| 项     | 值                                |
| ------ | --------------------------------- |
| 包名   | `@vxture/service-subscription`    |
| 路径   | `services/commerce/subscription/` |
| @layer | `Domain`                          |
| 所属域 | `commerce`                        |

## 职责

订阅管理：订阅计划查询、订阅状态管理、功能权限校验（feature gating）。

## 目录结构

```
src/
├── module/       # subscription.module.ts
├── service/      # subscription.service.ts
├── repository/   # subscription.repository.ts
├── dto/          # *.dto.ts
├── types/        # subscription.types.ts
└── index.ts
```

## Feature Gating 约束

- `hasFeature(tenantId, feature)` 是核心方法，返回 `boolean`
- feature 列表用枚举定义在 `subscription.types.ts`
- 不跨 service 查询计费数据（billing 数据由 BFF aggregator 组合）

## Barrel Export 规则

```typescript
export { SubscriptionModule } from "./module/subscription.module";
export { SubscriptionService } from "./service/subscription.service";
export type {
  SubscriptionPlan,
  SubscriptionStatus,
  PlatformFeature,
} from "./types/subscription.types";
// 禁止导出 SubscriptionRepository
```
