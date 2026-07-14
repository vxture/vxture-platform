# @vxture/service-ticket

> ⚠️ 待大版本重构 | 迁移自 `services/support/ticket/AGENTS.md`
> 架构层参考：[`docs/architecture/04-service-layer.md`](../../architecture/04-service-layer.md)

---

## 包信息

| 项     | 值                         |
| ------ | -------------------------- |
| 包名   | `@vxture/service-ticket`   |
| 路径   | `services/support/ticket/` |
| @layer | `Domain`                   |
| 所属域 | `support`                  |

## 职责

工单支持：工单创建与查询、工单状态流转、工单分配。

## 工单状态流转约束

- 状态枚举：`open` / `in_progress` / `resolved` / `closed`
- 流转规则在 service 层维护，repository 只做持久化
- 不跨 service 查询用户计费状态（由 BFF aggregator 组合）

## Barrel Export 规则

```typescript
export { TicketModule } from "./module/ticket.module";
export { TicketService } from "./service/ticket.service";
export type {
  Ticket,
  TicketStatus,
  TicketPriority,
} from "./types/ticket.types";
// 禁止导出 TicketRepository
```
