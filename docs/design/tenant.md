---
title: 多租户设计
category: design
updated: 2026-05-10
---

# 多租户设计

> ⚠️ **SUPERSEDED · 标记删除（2026-07-06，ADR-12）——本文档的"单层租户模型"已过时，仅存档待删，不得作为实施依据。**
> 现行权威：租户模型 = **四层稳定模型 `User → Tenant(personal/organization) → Workspace → 两级 Membership`**，见 `data_platform_100_architecture.md` §3.4 + `data_identity_200_schema.md`（字段级）+ ADR-11 §11.1a；`tenant.type` 取值以 `personal|organization` 为准（本文 `individual` 作废）。workspace 为订阅/权益/隔离主体（ADR-11），产品分层与共享语义见 `product_100_matrix.md` + `product_110_sharing-isolation.md` v1.0。
> 本文所述 tenantId 解析链/Redis key 等实现描述反映旧实现，校订价值已并入各权威文档；确认无引用后执行删除（删除为独立动作，须 owner 确认）。

## 租户模型

Vxture 采用 PLG（Product-Led Growth）单层租户模型：一个账号注册后可选择创建「个人租户」或「企业租户」，租户与账号之间是 1-1 或 N-N 关系（一个账号可以是多个租户的成员）。

```
Account ──┬── TenantMember ── Tenant (individual)
           └── TenantMember ── Tenant (organization, 以 owner 身份)
```

租户类型（`tenant.type`）：

| 类型           | 说明     |
| -------------- | -------- |
| `individual`   | 个人租户 |
| `organization` | 企业租户 |

---

## tenantId 解析链

`TenantMiddleware` 按以下优先级顺序解析 `tenantId`，写入 `request.tenant`：

```
1. x-tenant-id Header      ← 机器调用 / API Key 场景
2. Subdomain               ← acme.vxture.com → tenantId = "acme"
3. JWT payload             ← 浏览器 Cookie 登录场景
4. FALLBACK                ← 无法解析，tenantId = undefined
```

对应代码：`packages/core/tenant/src/utils/tenant.utils.ts` → `resolveTenantId()`

```typescript
export type TenantResolveSource = "header" | "subdomain" | "jwt" | "fallback";

export interface TenantInfo {
  id: string;
  resolvedFrom: TenantResolveSource;
}
```

---

## TenantContext（REQUEST 作用域）

`TenantContext` 是 NestJS **REQUEST 作用域**的 Provider，在每次 HTTP 请求生命周期内持有当前租户信息。

```typescript
// 注入方式（BFF / Service 层）
constructor(@Inject(TENANT_CONTEXT) private readonly tenantCtx: TenantContext) {}

// 读取
const tenantId = this.tenantCtx.tenantId;     // 当前租户 ID
const source   = this.tenantCtx.resolvedFrom; // 解析来源
```

---

## TenantMiddleware 行为约定

中间件**永不阻塞请求**。解析失败时静默 catch，执行 `next()`：

```typescript
// packages/core/tenant/src/middleware/tenant.middleware.ts
try {
  req.tenant = resolveTenantId(req, this.options);
} catch {
  // 静默，不抛出
}
next();
```

真正的租户鉴权由 **Guard 层**完成（检查 `request.tenant` 是否存在且合法）。设计意图：中间件注册在所有路由之前，公开端点（`/health`、`/api/auth/login`）不需要租户上下文，不能因解析失败而被挡住。

---

## Redis 键隔离

所有与租户相关的 Redis 操作使用 `tenantKey()` 工具函数生成命名空间键：

```typescript
// packages/core/tenant/src/utils/tenant.utils.ts
export function tenantKey(tenantId: string, key: string): string {
  return `tenant:${tenantId}:${key}`;
}

// 示例
tenantKey("acme", "user:123"); // → "tenant:acme:user:123"
tenantKey("acme", "quota:llm"); // → "tenant:acme:quota:llm"
```

此约定确保不同租户的缓存/状态数据物理隔离，防止串租。

---

## 租户初始化流程

注册完成后，前端调用 `POST /api/auth/tenant/init` 完成租户绑定：

```
1. 前端 VerifyForm.handleChoose() 选择租户类型
   ↓
2. POST /api/auth/tenant/init { type: 'individual' | 'organization' }
   ↓
3. WebsiteAuthService.initTenant()
   ├── OrganizationReadService.createTenantForAccount()
   │   └── 事务：INSERT tenant + INSERT tenant_member(owner)
   └── 重签 JWT（注入 tenantId + authScope.TENANT_CONSOLE）
   ↓
4. window.location.href → /console（携带新 JWT Cookie）
```

代码入口：

- `bff/website-bff/src/routers/auth.router.ts` → `POST /api/auth/tenant/init`
- `services/tenant/organization/src/repository/pg-organization.repository.ts` → `createTenant()`

---

## 跨包职责划分

| 包                             | 职责                                    |
| ------------------------------ | --------------------------------------- |
| `packages/core/tenant`         | 解析逻辑、TenantContext、tenantKey 工具 |
| `services/tenant/organization` | 租户 CRUD（Postgres），只读仓储层       |
| `bff/website-bff`              | 租户初始化 API、TenantMiddleware 注册   |
| `bff/console-bff`              | TenantMiddleware 注册，租户上下文路由   |
| `bff/admin-bff`                | 平台侧租户管理（跨租户查询）            |

---

## 参考文档

- `docs/design/auth.md` — 账号体系与认证设计
- `docs/packages/core/tenant.md` — core-tenant 包实现约束
- `docs/architecture/00-overview.md` — 层级总览
