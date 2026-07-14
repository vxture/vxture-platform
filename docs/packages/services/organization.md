# @vxture/service-organization

> 架构层参考：[`docs/architecture/04-service-layer.md`](../../architecture/04-service-layer.md)

---

## 包信息

| 项     | 值                              |
| ------ | ------------------------------- |
| 包名   | `@vxture/service-organization`  |
| 路径   | `services/tenant/organization/` |
| @layer | `Domain`                        |
| 框架   | NestJS                          |

## 职责

租户组织数据**只读**服务：为 BFF 层提供租户基础信息查询能力（名称、配置、成员列表等）。

## 目录结构

```
src/
├── module/         ← OrganizationModule
├── service/        ← OrganizationService（只读查询）
├── repository/     ← Prisma 数据访问
├── tokens.ts       ← DI Symbol tokens
└── types/          ← 组织类型定义
```

## 依赖约束

```typescript
✅ @vxture/core-database / @vxture/core-tenant / @vxture/shared
❌ 写操作（只读服务，不执行 create / update / delete）
❌ 其他 @vxture/service-*
```

## 核心接口

| 方法                          | 说明                               |
| ----------------------------- | ---------------------------------- |
| `getTenant(tenantId)`         | 查租户基本信息（名称、配置、状态） |
| `getMembers(tenantId)`        | 查成员列表（含角色）               |
| `getMember(tenantId, userId)` | 查单个成员                         |

**只读限制**：所有方法都是查询，不提供 create / update / delete 操作。写操作在 website-bff（租户初始化）或 admin-bff（运营管理）直接通过 Prisma 执行。

**消费方**：console-bff（成员管理页）、admin-bff（租户列表）、website-bff（租户初始化检查）
