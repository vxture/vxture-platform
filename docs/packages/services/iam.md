# @vxture/service-iam

> 架构层参考：[`docs/architecture/04-service-layer.md`](../../architecture/04-service-layer.md)

---

## 包信息

| 项     | 值                       |
| ------ | ------------------------ |
| 包名   | `@vxture/service-iam`    |
| 路径   | `services/identity/iam/` |
| @layer | `Domain`                 |
| 框架   | NestJS                   |

## 职责

身份与账户认证服务：账号隔离管理、账户生命周期、跨租户身份查询。

## 目录结构

```
src/
├── module/         ← NestJS Module 定义
├── service/        ← 业务逻辑
├── repository/     ← Prisma 数据访问
├── tokens.ts       ← DI Symbol tokens
└── types/          ← 类型定义
```

## 依赖约束

```typescript
✅ @vxture/core-auth / @vxture/core-database / @vxture/shared
❌ @vxture/service-* 其他服务（服务间禁止直接引用）
❌ bff-* / portals/* / agent-server/*
```

## 核心设计

**账号层级：**

- `account`：全局唯一身份（一个人一个账号，跨租户共享）
- `tenant_member`：账号在某租户的成员关系（一对多）
- `credentials`：密码凭证，与 account 绑定

**与 auth-bff 的协作：**

- iam 负责：账号查询、密码验证（`bcrypt.compare`）、账号生命周期（创建/停用）
- auth-bff 负责：JWT 签发（iam 不接触 Token）
- website-bff 登录流程：`iam.verifyCredential()` → 成功 → 调用 auth-bff `/auth/internal/sign`

**跨租户查询（iam vs organization 的区别）：**

- iam：查 `identity` 层（身份，跨租户），如「这个邮箱是否已注册」
- organization：查 `tenant` 层（组织，租户内），如「这个租户有哪些成员」
