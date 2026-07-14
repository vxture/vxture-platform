# ADR-004: BFF 层框架选型原则

**状态**：✅ Accepted
**日期**：2026-02-01

---

## 背景

BFF 层需要 Node.js 服务端框架。但各 BFF 职责差异显著，不能一刀切地选同一框架。

按职责复杂度，BFF 分为两类：

| 类型           | 代表 BFF                                                       | 核心职责                                   |
| -------------- | -------------------------------------------------------------- | ------------------------------------------ |
| **业务型 BFF** | auth / console / admin / varda / agent-template / 外部业务 BFF | JWT 验证、tenant 解析、RBAC 守卫、请求聚合 |
| **代理型 BFF** | gateway                                                        | 纯路径路由转发，零鉴权，零业务逻辑         |

## 框架选项

### NestJS

模块化 DI 框架，内置 Guards、Interceptors、Pipes、ExceptionFilters。

**适合场景**：业务型 BFF。`@UseGuards(AuthGuard, TenantGuard)` 与中间件链（Auth → Tenant → Permission → Router）天然对应；DI 使测试中可替换 Redis/HTTP 依赖；Guards 可跨 BFF 复用。NestJS 的显式约定（Module → Controller → Guard → Service）对 AI coding 友好——结构固定，AI 生成代码一致性高，不会因框架自由度而产生风格漂移。

**不适合场景**：代理型 BFF。零业务逻辑意味着 DI 容器、Guards、Module 三件套全部是不必要的开销。

### Hono

超轻量路由框架，TypeScript 原生，启动极快。

**适合场景**：代理型 BFF。路由规则简单，无需 DI，Hono 的 `app.use()` + `app.all()` 足够覆盖纯转发需求，构建产物极小。

### Express / Fastify

**结论**：Express 自由度过高，无结构约束，跨 BFF 一致性差；Fastify 介于 Hono 和 NestJS 之间，无明显优势，不选。

## 决策

**按职责复杂度分层选型，以 NestJS 为主、Hono 为辅：**

- **业务型 BFF → NestJS**（默认）：Guard/DI/Module 结构统一，AI coding 下产出一致，便于跨 BFF 复用中间件
- **代理型 BFF → Hono**：纯转发场景，NestJS 的能力在此处没有价值，用轻量框架
- **新建 BFF 时**：先判断是业务型还是代理型，再选框架；优先保持结构一致性，有充分理由才偏离

## 后果

**正面：**

- 业务型 BFF 结构统一（Module → Controller → Guard → Service），可互相参照
- Guards（`AuthGuard` / `TenantGuard` / `PermissionGuard`）跨业务型 BFF 复用
- 代理型 BFF 轻量部署，构建产物小，启动快
- 原则清晰：新 BFF 有明确的选型依据，不需要每次从头讨论

**负面：**

- 层内存在两种框架，新成员需要理解分型依据
- 业务型 BFF 冷启动约 500ms-1s（容器 always-on 部署，无实际影响）
- NestJS 的 `experimentalDecorators: true` 是前提（全项目已启用）

---

_决策人：架构组 | 实施于：`bff/*/`（业务型用 NestJS，gateway-bff 用 Hono）_
