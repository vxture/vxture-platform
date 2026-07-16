# @vxture/shared

> 上下文导航指针 | 完整文档在 `docs/` 体系

## 工作前必读

| 步骤            | 文档                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1. 全局规则     | 根目录 `AGENTS.md`（G1–G6）                                                                                         |
| 2. 任务路由     | [`docs/90-memory/agent.md`](../../../docs/90-memory/10-agent.md)                                                    |
| 3. 层架构规范   | [`docs/30-design/architecture/04-shared-layer.md`](../../../docs/30-design/architecture/02-package-boundaries.md)   |
| 4. 包实现上下文 | [`docs/40-implementation/packages/shared/00-index.md`](../../../docs/40-implementation/packages/shared/00-index.md) |

> 零业务逻辑，纯工具 / 类型 / 常量。所有层均可依赖，禁止反向引用。
