# @vxture/auth-bff

> 上下文导航指针 | 完整文档在 `docs/` 体系

## 工作前必读

| 步骤            | 文档                                                                              |
| --------------- | --------------------------------------------------------------------------------- |
| 1. 全局规则     | 根目录 `AGENTS.md`（G1–G6）                                                       |
| 2. 任务路由     | [`docs/agent.md`](../../../docs/agent.md)                                         |
| 3. 层架构规范   | [`docs/architecture/05-bff-layer.md`](../../../docs/architecture/05-bff-layer.md) |
| 4. 包实现上下文 | [`docs/packages/bff/auth.md`](../../../docs/packages/bff/auth.md)                 |

> 职责：JWT 统一签发、OAuth 流程、Cookie 管理

## ⚠️ 未解决技术债务

| ID     | 位置                                                        | 问题                                                                          | 详情                                                                                                     |
| ------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| TD-012 | `src/providers/dingtalk\|feishu.provider.ts` 🔴             | OAuth 凭据（DINGTALK/FEISHU key & secret）未入 schema，缺失时空字符串静默通过 | [tech-debt.md](../../../docs/tech-debt.md#td-012--bff-oauth-provider-凭据未入-core-config-schema)        |
| TD-013 | `src/routers/oauth\|password-auth\|phone-auth.router.ts` 🟡 | 跨服务 URL / cookie domain 直接读 `process.env`，无 fail-fast                 | [tech-debt.md](../../../docs/tech-debt.md#td-013--bff-跨服务-url--cookie-domain-未入-core-config-schema) |
