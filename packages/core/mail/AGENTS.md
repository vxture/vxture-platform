# @vxture/core-mail

> 上下文导航指针 | 完整文档在 `docs/` 体系

## 工作前必读

| 步骤            | 文档                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| 1. 全局规则     | 根目录 `AGENTS.md`（G1–G6）                                                                                |
| 2. 任务路由     | [`docs/90-memory/agent.md`](../../../docs/90-memory/10-agent.md)                                           |
| 3. 层架构规范   | [`docs/30-design/architecture/05-core-layer.md`](../../../docs/30-design/architecture/03-core-layer.md)    |
| 4. 包实现上下文 | [`docs/40-implementation/packages/core/mail.md`](../../../docs/40-implementation/packages/core/60-mail.md) |

> 职责：事务邮件发送（nodemailer 封装），SMTP 未配置时自动 no-op
> 注意：业务邮件模板（验证码/密码重置）在 @vxture/service-mail，不在此包
