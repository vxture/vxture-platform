# Vxture

大模型与智能体企业 SaaS 平台。pnpm workspace monorepo，TypeScript 5.9.3 / ES2023，Node.js ≥ 22.0.0。

两个产品面：**Platform**（运营后台，面向管理员，慢迭代）和 **Agent Studio**（AI 产品，面向终端用户，快迭代）。

---

## 架构

### 层级结构

```
portals/* / agent-studio/*                ← Presentation（展示层）
                │  HTTP only，禁止包引用
                ▼
             bff/*                         ← Application（BFF 层）
                │
         ┌──────┴──────┐
         ▼             ▼
  agent-server/*   services/*/*            ← Application / Domain
         │             │
         └──────┬───────┘
                ▼
         @vxture/model-runtime-client                    ← Infrastructure
                ▼
         packages/core/*                   ← Infrastructure
                ▼
         @vxture/shared                    ← Shared（零业务逻辑）
```

### 层目录对照

| 目录                               | @layer               | 变更频率  |
| ---------------------------------- | -------------------- | --------- |
| `portals/*`                        | Presentation         | Slow      |
| `agent-studio/*`                   | Presentation         | Fast      |
| `bff/*`                            | Application          | Medium    |
| `agent-server/*`                   | Application / Domain | Fast      |
| `services/*/*`                     | Domain               | Slow      |
| `packages/core/*`                  | Infrastructure       | Very Slow |
| `packages/ai/model-runtime-client` | Infrastructure       | Medium    |
| `packages/platform/*`              | Infrastructure       | Low       |
| `packages/design/design-system`    | Presentation         | Slow      |
| `packages/shared/shared`           | Shared               | Very Slow |

---

## 展示层 — Platform（portals/）

面向管理员，Next.js 15 App Router，慢迭代。

| 包                | 端口 | 职责                                                                                     |
| ----------------- | ---- | ---------------------------------------------------------------------------------------- |
| `@vxture/website` | 3010 | 公开营销站 + 认证页。Content Registry 机制统一接管所有内容类页面（legal / blog / faq）。 |
| `@vxture/console` | 3020 | 租户工作台：成员、订阅、权限、设置管理。嵌入 Varda 智能助手（console surface）。         |
| `@vxture/admin`   | 3030 | 平台运营后台：租户、账单、用户、配置、工单管理。嵌入 Varda 智能助手（admin surface）。   |

## 展示层 — Agent Studio（agent-studio/）

面向终端用户，快迭代。

| 包                           | 端口 | 职责                                               |
| ---------------------------- | ---- | -------------------------------------------------- |
| `@vxture/agent-studio-varda` | 3120 | Varda 智能助手前端（嵌入式微前端，随 portal 加载） |

Ruyin 已迁出到外部业务仓库 `vxture/agentstudio-ruyin`，由该仓维护 worker-02 beta/prod 部署。本仓只保留平台 auth / SSO / Model Platform 契约说明。

---

## 应用层 — BFF（bff/）

只做请求聚合 + 鉴权，零业务逻辑。**JWT 签发唯一入口：`@vxture/bff-auth`**，所有其他 BFF 委托此服务完成 token 签发，不自行生成 JWT。

| 包                    | 职责                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `@vxture/bff-auth`    | JWT 签发、刷新、吊销；OAuth（Google / 钉钉）回调；跨域 SSO；Cookie 管理                            |
| `@vxture/bff-gateway` | 浏览器侧统一 API 入口网关，端口聚合                                                                |
| `@vxture/bff-website` | 官网 BFF：JWT 验证 only，鉴权逻辑代理至 auth-bff                                                   |
| `@vxture/bff-console` | 租户工作台 BFF：服务聚合，委托 auth-bff 签发 JWT                                                   |
| `@vxture/bff-admin`   | 运营后台 BFF：服务聚合，委托 auth-bff 签发 JWT                                                     |
| `@vxture/bff-varda`   | Varda 智能助手 BFF：构建 CallerContext（surface / userId / tenantId / allowedTools），SSE 流式代理 |

外部业务 BFF（如 Ruyin）通过 HTTP/SSO 调用平台 auth-bff，不作为本仓 `bff/*` 包维护。

## 应用层 — Agent Server（agent-server/）

每个 agent-server 独立治理，禁止跨 agent-server 的包引用。

| 包             | 端口 | 职责                                                                                                                              |
| -------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| `varda-server` | 3122 | Varda 私有后端：接收 varda-bff 的 CallerContext，经 ToolRegistry 白名单过滤，执行 Tool Use Loop，流式返回 SSE，持久化会话与消息。 |

Ruyin 私有后端已迁入 `vxture/agentstudio-ruyin`，业务服务如需 AI 能力只能通过受控 HTTP/API 调用平台 Model Platform。

---

## 领域层 — Services（services/）

跨 agent 共享的领域服务。**promote-when-ready 原则**：logic 在 agent-server 中被 2+ agent 验证复用后，才提升至此层。

| 分类 | 包                               | 职责                                                         |
| ---- | -------------------------------- | ------------------------------------------------------------ |
| AI   | `@vxture/service-model-platform` | 端口 3100。模型注册与路由调度，配额计量，LLM 调用统一出口。  |
| 身份 | `@vxture/service-iam`            | 身份与账户认证，账户隔离管理。                               |
| 商务 | `@vxture/service-billing`        | 发票、支付记录、账单管理。                                   |
| 商务 | `@vxture/service-subscription`   | 方案管理、订阅生命周期、功能门控（`hasFeature()`）。         |
| 通知 | `@vxture/service-mail`           | 邮件发送（阿里云 SMTP / DirectMail）+ Redis 验证码限流。     |
| 通知 | `@vxture/service-sms`            | 短信发送（阿里云 Dysmsapi）。                                |
| 支持 | `@vxture/service-ticket`         | 工单管理，状态机：`open → in_progress → resolved → closed`。 |
| 租户 | `@vxture/service-organization`   | 租户组织数据只读服务。                                       |

---

## 基础设施层（packages/）

### 共享层

**`@vxture/shared`**（`packages/shared/shared/`）

零业务逻辑，纯工具 / 类型 / 常量。唯一可被所有层双向引用的包。

### Core 层（packages/core/）

平台级基础设施原语，极低变更频率。Core 包之间禁止互相依赖。

| 包                      | 职责                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `@vxture/core-auth`     | JWT 验证客户端、OAuth Provider 类型、NestJS Guards/Decorators、角色枚举            |
| `@vxture/core-api`      | Node.js HTTP 客户端基础设施，基于 `@nestjs/axios`，含重试与错误处理                |
| `@vxture/core-tenant`   | tenantId 解析（header → subdomain → JWT → fallback），AsyncLocalStorage 上下文传播 |
| `@vxture/core-config`   | `process.env` → Zod schema 验证 → 类型安全 config 对象，唯一运行时依赖 zod         |
| `@vxture/core-locale`   | 服务端 locale 解析与内容本地化，无任何 NestJS 依赖                                 |
| `@vxture/core-mail`     | 事务邮件发送基础能力（Nodemailer），被 service-mail 消费                           |
| `@vxture/core-database` | Prisma DDL 管理，覆盖 6 个 schema：账户 / 租户 / 产品 / 平台 / 支持 / 商务         |
| `@vxture/core-utils`    | 结构化日志（VxLogger）、环境检测、平台级工具函数                                   |

### Model Runtime Client

**`@vxture/model-runtime-client`**（`packages/ai/model-runtime-client/`）

LLM / RAG / Embedding / Workflow SDK。所有 agent-server 通过此包调用大模型，禁止直接引入 Anthropic / Doubao 等 provider SDK。

### 设计系统

**`@vxture/design-system`**（`packages/design/design-system/`）

设计 token、UI 组件（Radix UI + Tailwind CSS 4）、主题系统、图标库。所有展示层通过此包获取 UI 组件，禁止直接引入 `@radix-ui/*` 或 `@phosphor-icons/react`。

### 平台 SDK

**`@vxture/platform-browser`**（`packages/platform/browser/`）

浏览器端平台工具：滚动、剪贴板、视口检测、本地存储等。

---

## 工具

**`@vxture/dev-panel`**（`tools/dev-panel/`，端口 8090）

本地可视化服务控制面板，统一管理各服务的启动 / 停止 / 重启 / 日志查看，按依赖顺序启动服务，并进行接口级健康检查。

---

## 快速开始

### 环境要求

| 工具       | 版本要求 |
| ---------- | -------- |
| Node.js    | ≥ 22.0.0 |
| pnpm       | ≥ 10.0.0 |
| PostgreSQL | ≥ 13     |
| Redis      | ≥ 6      |

### 初始化

```bash
pnpm install

# 构建所有基础包（shared → core → platform → design）
pnpm build:all

# 配置环境变量（各服务目录下有 .env.example）
cp portals/website/.env.example portals/website/.env.local
```

### 开发命令速查

```bash
# 展示层
pnpm dev              # website         :3010
pnpm dev:console      # console         :3020
pnpm dev:admin        # admin           :3030

# BFF 层
pnpm dev:auth-bff     # auth-bff（必须最先启动）
pnpm dev:website-bff  # website-bff
pnpm dev:console-bff  # console-bff
pnpm dev:admin-bff    # admin-bff
pnpm dev:gateway      # gateway-bff

# 服务层
pnpm dev:model-platform   # model-platform service :3100

# 控制面板
pnpm dev:panel        # dev-panel       :8090
```

### 代码质量

```bash
pnpm lint             # ESLint 全量检查
pnpm lint:fix         # 自动修复
pnpm lint:design      # Design System 合规检查（包边界 + token 使用）
pnpm type-check       # TypeScript 类型检查（website）
pnpm type-check:all   # 全包类型检查
pnpm health           # 完整健康检查（env + type + lint）
```

### 数据库

```bash
pnpm db:migrate       # 执行 Prisma migration
pnpm db:reset         # 重置数据库
pnpm db:seed          # 填充测试数据
```

---

## 端口总表

| 服务                             | 端口 | 层           |
| -------------------------------- | ---- | ------------ |
| `@vxture/website`                | 3010 | Presentation |
| `@vxture/console`                | 3020 | Presentation |
| `@vxture/admin`                  | 3030 | Presentation |
| `@vxture/agent-studio-varda`     | 3120 | Presentation |
| `varda-server`                   | 3122 | Application  |
| `@vxture/service-model-platform` | 3100 | Domain       |
| `@vxture/dev-panel`              | 8090 | Tools        |

> 完整端口分配规则（含 BFF 端口）见 [`docs/ai/port-allocation.md`](docs/ai/port-allocation.md)。

---

## 文档体系

以 [`docs/agent.md`](docs/agent.md) 为入口，所有文档统一在 `docs/` 管理。

| 目录                                       | 内容                                                |
| ------------------------------------------ | --------------------------------------------------- |
| [`docs/architecture/`](docs/architecture/) | 层级结构与依赖边界（权威参考）                      |
| [`docs/design/`](docs/design/)             | 跨包能力域技术设计（Auth / Locale / 权限 / 多租户） |
| [`docs/packages/`](docs/packages/)         | 各包实现上下文（AI 编码时的主要参考）               |
| [`docs/product/`](docs/product/)           | 产品规格（Varda / Admin；Ruyin 已迁出）             |
| [`docs/deployment/`](docs/deployment/)     | 部署方案（基础设施 / 环境变量 / CI-CD）             |
| [`docs/ai/`](docs/ai/)                     | AI 编码规范与审计清单                               |
| [`docs/standards/`](docs/standards/)       | 工程规范（Git / Locale / Utils）                    |

---

_版本：2.0.0 | 2026-05-10_
