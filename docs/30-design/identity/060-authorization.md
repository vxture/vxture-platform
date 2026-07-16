---
title: 权限模型跨包设计
category: design
updated: 2026-05-12
---

# Identity 授权 / 两级 RBAC 执行（identity 板块 · 详细层）

> 🧭 架构层见 [`identity-platform-architecture.md`](./040-architecture.md)（板块定位 / 边界 / 授权总览）。本文 = 两级 RBAC **执行**的详细层 reference（BFF 守卫 / menu↔permission 映射 / 跨包协作）。
> 平台数据模型权威 = [data_platform_100_architecture.md](../data_platform_100_architecture.md) + [-schema.md](../data_platform_200_schema.md)：iam `role`/`permission`/`role_permission` 字段级见 **b §5**，本文不重述 DDL。

**版本**：1.0.0
**日期**：2026-05-12
**范围**：service-iam · admin-bff · console-bff · 外部业务 BFF · portals/admin

> 本文档描述 RBAC 权限模型在多个包之间如何协作。单个包的实现约束见 `docs/40-implementation/packages/` 体系；Admin 权限管理页面的 UI 规范见 `docs/20-specs/platform/admin/permissions-page.md`。

---

## 1. RBAC 模型（引用）

iam RBAC 权限模型（`permission` / `role` / `role_permission` / 角色绑定，字段级权威）= [data_platform_200_schema.md](../data_platform_200_schema.md) §iam；域概览见 [data_platform_100_architecture.md](../data_platform_100_architecture.md) §3.4。本文不重述平台 DDL。

术语对齐（重建后 iam 模型）：

- 角色作用域用 `role.scope` = `org | workspace`（**无 `role.type`**）；不再使用旧的 `MENU | BUTTON | API` 作为权限模型字段——菜单/按钮/接口的可见性映射属于**应用层 code 约定**（见 §5），非 iam 表结构字段。
- 运营侧数据归 **admin 域**（原 `operator_*`，见 -schema.md §14）。
- `tenant.type` = `personal | organization`；`realm` = `customer | workforce`。

---

## 2. 两套独立权限域

平台维护两套完全独立的权限域，互不干涉。

| 维度       | 运营账号权限域             | 租户账号权限域                                         |
| ---------- | -------------------------- | ------------------------------------------------------ |
| 账号类型   | `operator`                 | `tenant_user`                                          |
| 管理入口   | admin portal               | console portal（未来规划）                             |
| 角色作用域 | 全平台（无 tenantId）      | 单租户（绑定 tenantId）                                |
| 数据隔离   | admin 域（-schema.md §14） | iam 租户域 + tenantId 过滤（role.scope=org/workspace） |
| 当前状态   | 已实现                     | 初步结构，权限 UI 待建                                 |

---

## 3. 权限数据流（跨包协作）

```
service-iam（持久化 + 查询）
       ↑ 内部调用
  admin-bff（权限 CRUD API）
       ↑ HTTP
  portals/admin（权限管理页）
```

```
service-iam（权限查询）
       ↑ 内部调用
  admin-bff / console-bff / 外部业务 BFF（BFF guard）
       ↑ JWT 上下文 role
  每个 BFF 路由（权限检查 middleware）
```

---

## 4. BFF 权限执行层

每个 BFF 中间件执行两级检查：

### 4.1 身份类型守卫（所有 BFF 必须）

```
admin-bff    → JWT userType === "operator"，否则 403
console-bff  → JWT userType === "tenant_user"，否则 403
外部业务 BFF（如 Ruyin）→ JWT userType === "tenant_user"，否则 403
```

### 4.2 路由级权限检查（按需）

BFF 路由通过装饰器声明所需权限 code，中间件查询用户角色绑定的 permission 集合进行匹配：

```typescript
@RequirePermission('user.delete')
@Delete(':id')
deleteUser() { ... }
```

检查失败返回 403，检查通过才进入业务逻辑。

### 4.3 租户数据隔离

console-bff 和外部业务 BFF 所有数据查询：

- `tenantId` 只从 JWT 上下文获取，禁止从请求参数接收
- 权限查询必须携带 `tenantId` 作为过滤条件

---

## 5. menu `code` 与权限 code 的映射

前端菜单项通过 `code` 与权限系统绑定：

```
菜单 code → Permission.code（type: MENU）
  对应按钮操作 → Permission.code（type: BUTTON，父级为同名 MENU code）
```

示例：

```
菜单 "用户管理" → code: user（MENU）
  按钮 "查看用户"  → code: user.view（BUTTON）
  按钮 "创建用户"  → code: user.create（BUTTON）
  按钮 "删除用户"  → code: user.delete（BUTTON）
```

前端渲染逻辑：

1. 从 BFF session 接口获取当前用户拥有的 permission code 集合
2. 菜单项：检查对应 MENU code 是否在集合中，不在则隐藏
3. 按钮：检查对应 BUTTON code 是否在集合中，不在则禁用或隐藏

---

## 6. service-iam 职责边界

`services/identity/iam/` 是权限数据的唯一持久化层，负责：

- Permission 的 CRUD（含 code 唯一约束、系统预置保护）
- Role 的 CRUD 与权限绑定
- 用户角色绑定关系
- 权限集合查询（给定 userId + tenantId 返回 code 集合）

BFF 不直接读权限表，通过内部服务调用 service-iam。

---

## 7. 代码审查规范

- [ ] 新增路由必须声明权限 code 或明确标注 `@Public()`
- [ ] 权限 code 格式：`{resource}.{action}`，全局唯一
- [ ] 系统预置权限的 `source` 字段禁止在业务代码中修改
- [ ] 删除操作执行前必须检查子权限、角色引用、接口绑定
- [ ] 租户权限查询必须携带 tenantId 过滤，禁止全租户扫描
- [ ] 前端不得硬编码权限 code 字符串，必须引用共享常量

---

## 8. 关联文档

- `docs/20-specs/platform/admin/permissions-page.md` — 权限管理页 UI 规范
- `docs/30-design/auth.md` — JWT userType / authScope / BFF 守卫规则
- `docs/40-implementation/packages/services/iam.md` — service-iam 实现约束
- `docs/40-implementation/packages/bff/admin-bff.md` — admin-bff 包约束
