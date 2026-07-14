# @vxture/service-billing

> ⚠️ 待大版本重构 | 迁移自 `services/commerce/billing/AGENTS.md`
> 架构层参考：[`docs/architecture/04-service-layer.md`](../../architecture/04-service-layer.md)

---

## 包信息

| 项     | 值                           |
| ------ | ---------------------------- |
| 包名   | `@vxture/service-billing`    |
| 路径   | `services/commerce/billing/` |
| @layer | `Domain`                     |
| 所属域 | `commerce`                   |

## 职责

计费核心业务逻辑：账单记录管理、计费状态跟踪、用量统计。
供 BFF 层和 Agent Server 层消费，不直接面向前端。

## 目录结构

```
src/
├── module/       # billing.module.ts
├── service/      # billing.service.ts
├── repository/   # billing.repository.ts
├── dto/          # *.dto.ts
├── types/        # billing.types.ts
└── index.ts
```

## 依赖约束

**允许：** `@vxture/core-*` / `@vxture/shared` / NestJS / Prisma / class-validator / @nestjs/swagger

**禁止：**

- `@vxture/service-subscription` / `@vxture/service-ticket`（跨 service 隔离）
- `@vxture/model-runtime-client` / `design-system` / `platform-*` / `bff-*` / React / Next.js

## 分层职责约束

- **service**：只含业务逻辑，调用 repository，不直接操作 Prisma
- **repository**：封装所有 Prisma 操作，返回领域类型（非 Prisma 原始类型）
- **module**：只做模块声明和 provider 注册

## Barrel Export 规则

```typescript
export { BillingModule } from "./module/billing.module";
export { BillingService } from "./service/billing.service";
export type { BillingRecord, BillingStatus } from "./types/billing.types";
// 禁止导出 BillingRepository
```
