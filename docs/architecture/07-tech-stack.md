# Vxture 技术栈选型

**Version**: 1.0.0
**Last Updated**: 2026-03-11

本文档定义 Vxture 平台的技术栈选型。
选型原则：快速可用优先，重型方案推迟，预留升级路径。

---

## 1. 前端（portals / agent-studio）

| 类别        | 选型                                 | 说明                                    |
| ----------- | ------------------------------------ | --------------------------------------- |
| 框架        | Next.js 15（App Router）             | SSR / SSG / API Routes 一体             |
| UI 基础     | React 19 + TailwindCSS 4 + shadcn/ui | 组件基于 Radix UI 原语                  |
| 客户端状态  | Zustand                              | 轻量，无样板代码                        |
| 服务端状态  | TanStack Query                       | 数据请求、缓存、同步                    |
| 表单 & 校验 | react-hook-form + zod                | 性能优先，类型安全                      |
| 图标        | @phosphor-icons/react                | 通过 design-system 的 Icon 组件统一使用 |
| 主题        | next-themes                          | 亮色 / 暗色 / 系统跟随                  |
| 工具        | clsx + tailwind-merge                | className 合并                          |

---

## 2. 后端统一（BFF / Service / Agent Server）

所有后端层统一使用 NestJS，结构一致（Module / Controller / Service），DI 容器利于测试与解耦。

| 类别     | 选型                                               | 说明                         |
| -------- | -------------------------------------------------- | ---------------------------- |
| 框架     | NestJS                                             | 模块化、DI、装饰器风格       |
| 认证     | JWT（access token）+ Redis（refresh token 黑名单） | 无状态 + 主动吊销            |
| DTO 校验 | class-validator + class-transformer                | NestJS 内置生态，开箱即用    |
| ORM      | Prisma                                             | 类型安全，schema 即文档      |
| API 文档 | @nestjs/swagger                                    | 开发期自动生成，调试高效     |
| 异步队列 | BullMQ（基础功能）                                 | Redis 驱动，处理异步 AI 任务 |

---

## 3. 数据层

| 类别               | 当前选型                    | 升级方向               |
| ------------------ | --------------------------- | ---------------------- |
| 关系数据库         | PostgreSQL 16               | —                      |
| 缓存 / 队列 Broker | Redis 7                     | —                      |
| 向量数据库         | pgvector（PostgreSQL 扩展） | 规模化后迁移至 Qdrant  |
| 文件存储           | 云 OSS 直传（S3 兼容接口）  | 私有化部署时引入 MinIO |

> **pgvector 说明**：起步阶段复用 PostgreSQL，减少基础设施依赖。
> 当向量检索成为性能瓶颈（百万级以上）或需要多租户集合隔离时，迁移至 Qdrant。

---

## 4. Model Runtime Client（@vxture/model-runtime-client）

| 类别          | 当前选型                            | 升级方向                    |
| ------------- | ----------------------------------- | --------------------------- |
| LLM           | Doubao（豆包）+ Claude（Anthropic） | 按需增加 provider           |
| Embedding     | Doubao Embedding                    | 按需替换 BGE 系列私有模型   |
| RAG Pipeline  | 自研轻量 pipeline（基于 pgvector）  | 规模化后引入专用向量库      |
| Workflow 编排 | 简单串行调用（无 DSL）              | 后续抽象为轻量 workflow DSL |

> **设计原则**：agent-server 只与 @vxture/model-runtime-client 统一接口交互，切换 provider 不影响业务代码。

---

## 5. 基础设施

| 类别        | 当前选型                          | 升级方向                          |
| ----------- | --------------------------------- | --------------------------------- |
| 反向代理    | Nginx                             | —                                 |
| 容器化      | Docker + Docker Compose           | 规模化后引入 Kubernetes           |
| 编排        | Docker Compose（开发 + 早期生产） | Kubernetes（流量增长后）          |
| API Gateway | 无（Nginx 承担反向代理）          | Kong / APISIX（多服务统一治理时） |

---

## 6. 推迟 / 暂不引入项

| 技术         | 原因                            | 触发引入的条件                     |
| ------------ | ------------------------------- | ---------------------------------- |
| Qdrant       | pgvector 起步够用，减少基础设施 | 向量检索成瓶颈，或需多租户集合隔离 |
| Kubernetes   | Docker Compose 早期够用         | 实例数 > 5 或需要自动扩缩容        |
| MinIO        | 云 OSS 更省运维                 | 私有化部署需求                     |
| Workflow DSL | 过度设计，串行调用先满足需求    | 多 agent 共用复杂工作流时          |
| API Gateway  | BFF 承担路由聚合，当前不需要    | 服务数量增多需统一限流 / 监控      |

---

## 7. 版本锁定（当前基准）

| 技术              | 版本     |
| ----------------- | -------- |
| TypeScript        | 5.9.3    |
| ECMAScript Target | ES2023   |
| Next.js           | 15.x     |
| React             | 19.x     |
| TailwindCSS       | 4.x      |
| NestJS            | 11.x     |
| Prisma            | 6.x      |
| PostgreSQL        | 16.x     |
| Redis             | 7.x      |
| Node.js           | 22.x LTS |

---

End of document.
