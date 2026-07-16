# agent-server/\* 层

> 上下文导航指针 | 完整文档在 `docs/` 体系

## 工作前必读

| 步骤            | 文档                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| 1. 全局规则     | 根目录 `AGENTS.md`（G1–G6）                                                                           |
| 2. 任务路由     | [`docs/90-memory/agent.md`](../docs/90-memory/10-agent.md)                                            |
| 3. 层架构规范   | [`docs/30-design/architecture/06-agent-server.md`](../docs/30-design/architecture/06-agent-server.md) |
| 4. 包实现上下文 | `docs/40-implementation/packages/agents/{agent}/server.md`                                            |

> 每个 agent-server 独立治理，禁止跨 agent-server import。

## 目录边界

Ruyin 已迁出到 `vxture/agentstudio-ruyin`，本仓 `agent-server/` 不再维护 Ruyin 后端实现或 worker-02 部署入口。

当前本仓保留的 Agent Server 以 Varda 与 `agent-template` 为准。技术债务统一查阅 [`docs/60-operations/tech-debt.md`](../docs/60-operations/10-tech-debt.md)。
