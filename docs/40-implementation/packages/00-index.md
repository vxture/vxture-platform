# 包实现上下文索引

> 各包的实现约束、目录结构、依赖规则。
> 内容迁移自各包原有 `AGENTS.md`，标注「⚠️ 待大版本重构」的文件以现有内容为准，后续按实际代码核查更新。
>
> 层级架构见 → `docs/30-design/architecture/00-index.md`

---

## Core 层（Infrastructure）→ [`core/index.md`](./core/00-index.md)

| 文件                                     | 包名                    | 职责摘要                                    |
| ---------------------------------------- | ----------------------- | ------------------------------------------- |
| [`core/auth.md`](./core/auth.md)         | `@vxture/core-auth`     | JWT 验证 / session 工具 / 角色类型          |
| [`core/api.md`](./core/api.md)           | `@vxture/core-api`      | 统一 HTTP 客户端 / 拦截器 / 错误标准化      |
| [`core/tenant.md`](./core/tenant.md)     | `@vxture/core-tenant`   | tenantId 解析 / 租户上下文传播              |
| [`core/config.md`](./core/config.md)     | `@vxture/core-config`   | 环境变量 → 强类型配置对象（zod）            |
| [`core/locale.md`](./core/locale.md)     | `@vxture/core-locale`   | 服务端语言解析 / 内容本地化                 |
| [`core/utils.md`](./core/utils.md)       | `@vxture/core-utils`    | 日志 / 环境判断 / 类型守卫 / 错误类         |
| [`core/database.md`](./core/database.md) | `@vxture/core-database` | Prisma DDL 管理（6 个 Schema，唯一入口）    |
| [`core/mail.md`](./core/mail.md)         | `@vxture/core-mail`     | 事务邮件发送（nodemailer 封装，无业务模板） |

## Model Runtime Client 层（Infrastructure）

| 文件                                                         | 包名                           | 职责摘要                                                                                 |
| ------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------- |
| [`ai/model-runtime-client.md`](./ai/model-runtime-client.md) | `@vxture/model-runtime-client` | 当前 Model Platform / 目标 Model Runtime HTTP 客户端（LLM / Embedding / RAG / Workflow） |

## SDK 适配层（Infrastructure）

> 第三方平台适配库（浏览器 API / 地图 / 三维），代码路径 `packages/platform/*`

| 文件                                 | 包名                       | 职责摘要                                         |
| ------------------------------------ | -------------------------- | ------------------------------------------------ |
| [`sdk/browser.md`](./sdk/browser.md) | `@vxture/platform-browser` | 浏览器端通用工具（偏好存储 / 滚动 / 入口初始化） |

## Design System（Presentation）

| 文件                                                   | 包名                    | 职责摘要                                 |
| ------------------------------------------------------ | ----------------------- | ---------------------------------------- |
| [`design/design-system.md`](./design/design-system.md) | `@vxture/design-system` | UI 组件 / Token / 图标 / 主题 / 布局原语 |

## Shared 层

| 文件                                      | 包名             | 职责摘要                           |
| ----------------------------------------- | ---------------- | ---------------------------------- |
| [`shared/index.md`](./shared/00-index.md) | `@vxture/shared` | 纯工具 / 类型 / 常量（零业务逻辑） |

## BFF 层（Application）→ [`bff/index.md`](./bff/00-index.md)

| 文件                                 | 包名                  | 服务对象                        |
| ------------------------------------ | --------------------- | ------------------------------- |
| [`bff/auth.md`](./bff/auth.md)       | `@vxture/bff-auth`    | 统一认证网关（唯一 JWT 签发者） |
| [`bff/gateway.md`](./bff/gateway.md) | `@vxture/bff-gateway` | 浏览器侧统一 API 入口网关       |
| [`bff/admin.md`](./bff/admin.md)     | `@vxture/bff-admin`   | 运营后台                        |
| [`bff/console.md`](./bff/console.md) | `@vxture/bff-console` | 租户工作台                      |
| [`bff/website.md`](./bff/website.md) | `@vxture/bff-website` | 营销站点                        |
| [`bff/varda.md`](./bff/varda.md)     | `@vxture/bff-varda`   | Varda 智能助手                  |

**BFF 层通用约束：**

**只有 `@vxture/bff-auth` 签发 JWT。** 其他 BFF 的认证流程：验证凭证 → 委托 auth-bff `POST /auth/internal/sign` 签发 Cookie → 本地只保留 `JwtService.verify`。

- **middleware 执行顺序**：`auth` → `tenant` → `router`（console-bff 额外加 `permission`）
- **错误隔离**：每个 router 独立 try/catch，不冒泡
- **响应投影**：做字段投影，不透传后端原始结构
- **auth-bff 调用路径**：平台 BFF（VXTURE_DEPLOY_HOST）容器直连 `http://vx-auth-bff:3090`；外部业务仓库如需接入平台认证，只能通过 HTTP/SSO 契约调用 auth-bff，不引用本仓内部包
- **禁止**：直接签发 JWT / 跨 BFF 代码引用 / 引入 `@vxture/model-runtime-client` / BFF 层实现业务逻辑

## Service 层（Domain）→ [`services/index.md`](./services/00-index.md)

| 文件                                                         | 包名                             | 业务域                                                      |
| ------------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------- |
| [`services/model-platform.md`](./services/model-platform.md) | `@vxture/service-model-platform` | Model Platform 当前合并实现：模型控制面 / 运行面 / 配额计量 |
| [`services/iam.md`](./services/iam.md)                       | `@vxture/service-iam`            | 身份与账户认证                                              |
| [`services/billing.md`](./services/billing.md)               | `@vxture/service-billing`        | 账单 / 计费                                                 |
| [`services/subscription.md`](./services/subscription.md)     | `@vxture/service-subscription`   | 订阅 / Feature Gating                                       |
| [`services/mail.md`](./services/mail.md)                     | `@vxture/service-mail`           | 邮件发送 / 验证码                                           |
| [`services/sms.md`](./services/sms.md)                       | `@vxture/service-sms`            | 短信发送                                                    |
| [`services/ticket.md`](./services/ticket.md)                 | `@vxture/service-ticket`         | 工单支持                                                    |
| [`services/organization.md`](./services/organization.md)     | `@vxture/service-organization`   | 租户组织只读服务                                            |

## Agent 层 → [`agents/index.md`](./agents/00-index.md)

| 文件                                                                   | 名称                           | 部署模式  | 职责摘要                                 |
| ---------------------------------------------------------------------- | ------------------------------ | --------- | ---------------------------------------- |
| [`agents/varda/server.md`](./agents/varda/server.md)                   | `varda-server`                 | 嵌入式    | Varda Tool Use Loop / SSE / 会话持久化   |
| [`agents/varda/studio.md`](./agents/varda/studio.md)                   | `@vxture/agent-studio-varda`   | 嵌入式    | Varda 前端（微前端，载入 admin/console） |
| [`agents/agent-template/server.md`](./agents/agent-template/server.md) | `agent-template-server`        | fork 起点 | 新 Agent 后端 fork 模板                  |
| [`agents/agent-template/studio.md`](./agents/agent-template/studio.md) | `@vxture/agent-studio-agent01` | fork 起点 | 新 Agent 前端 fork 模板                  |

## Portal 层（Presentation）→ [`portals/index.md`](./portals/00-index.md)

| 文件                                         | 包名              | 职责摘要                                 |
| -------------------------------------------- | ----------------- | ---------------------------------------- |
| [`portals/website.md`](./portals/website.md) | `@vxture/website` | 营销站点（Next.js 15，Content Registry） |
| [`portals/admin.md`](./portals/admin.md)     | `@vxture/admin`   | 运营后台                                 |
| [`portals/console.md`](./portals/console.md) | `@vxture/console` | 租户工作台                               |

## 工具

| 文件                                         | 包名                | 职责摘要                        |
| -------------------------------------------- | ------------------- | ------------------------------- |
| [`tools/dev-panel.md`](./tools/dev-panel.md) | `@vxture/dev-panel` | 本地可视化服务控制面板（:8090） |

---

## Core 层通用约束

> `@layer Infrastructure` — 适用于所有 `packages/core/*` 包

Core 层是 framework-agnostic 的基础设施原语，为 BFF、Service、Agent Server 提供可复用的底层能力。

**禁止的依赖（全层适用）：**

| 禁止                                                                      | 原因                                          |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| NestJS / Passport.js                                                      | 属于 BFF/Application 层                       |
| Next.js / React / 浏览器专用 API                                          | 属于 Presentation 层（platform-browser 例外） |
| Prisma / Redis / HTTP 客户端                                              | 属于 Service/Domain 层                        |
| `@vxture/service-*` / `bff-*` / `ai-sdk` / `design-system` / `platform-*` | 属于上层包                                    |

**允许的内部依赖：**

- 所有 core 包可以引用 `@vxture/shared`
- `@vxture/core-auth` 可额外引用 `@vxture/core-config`
- 禁止 core 包之间的循环引用

**其他约束：**

- 不持久化任何状态（无 Redis 连接，无 DB 连接）
- 需要双端兼容（Node.js + 浏览器），除非包名明确标注 browser-only
- 不包含任何业务逻辑（角色权限判断、价格计算等属于 Service 层）

---

## Service 层通用约束

> `@layer Domain` — 适用于所有 `services/*/*` 包

**包结构模板：**

```
src/
├── module/       ← NestJS Module 定义（对外注册点）
├── service/      ← 业务逻辑
├── repository/   ← Prisma / pg.Pool 数据访问
├── tokens.ts     ← DI Symbol tokens（跨包注入用）
├── types/        ← 类型定义
└── index.ts      ← 公共出口（只导出 module / service / types，不导出 repository）
```

**跨包引用规则：**

- 服务间禁止直接 import（cross-service 通信只走 BFF/Server 层 HTTP）
- 禁止被 `portals/*` / `agent-studio/*` 或外部业务前端直接引用
- 可以被 `bff/*` / `agent-server/*` 以 NestJS Module 形式组合使用

**Barrel Export 约束：**

```typescript
// ✅ src/index.ts 只导出这些
export { XxxModule } from "./module/xxx.module";
export { XxxService } from "./service/xxx.service";
export type { XxxDto, XxxResult } from "./types/xxx.types";

// ❌ 禁止导出 Repository（实现细节，不属于公共契约）
```

**其他约束：**

- 服务是 NestJS Module 库，不是独立应用，不监听端口
- 所有 Prisma 操作封装在 repository 层，service 不直接调用 `prisma.*`
- 禁止 React / Next.js / 浏览器 API
