# @vxture/core-mail

> 上下文导航指针 | 完整文档在 `docs/` 体系

## 工作前必读

| 步骤            | 文档                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| 1. 全局规则     | 根目录 `AGENTS.md`（G1–G6）                                                         |
| 2. 任务路由     | [`docs/agent.md`](../../../docs/agent.md)                                           |
| 3. 层架构规范   | [`docs/architecture/05-core-layer.md`](../../../docs/architecture/05-core-layer.md) |
| 4. 包实现上下文 | [`docs/packages/core/mail.md`](../../../docs/packages/core/mail.md)                 |

> 职责：事务邮件发送（nodemailer 封装），SMTP 未配置时自动 no-op
> 注意：业务邮件模板（验证码/密码重置）在 @vxture/service-mail，不在此包
