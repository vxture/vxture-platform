# @vxture/core-tenant

> ⚠️ 待大版本重构 | 迁移自 `packages/core/tenant/AGENTS.md`
> 架构层参考：[`docs/architecture/03-core-layer.md`](../../architecture/03-core-layer.md)
> 能力域设计：[`docs/design/tenant.md`](../../design/tenant.md)

---

## 包信息

| 项     | 值                      |
| ------ | ----------------------- |
| 包名   | `@vxture/core-tenant`   |
| 路径   | `packages/core/tenant/` |
| @layer | `Infrastructure`        |

## 职责

多租户上下文管理：tenantId 解析、租户上下文传播、租户配置查询工具。
为所有后端层提供租户感知能力。

## 目录结构

```
src/
├── context/      # *.context.ts — 租户上下文存取工具
├── types/        # *.types.ts   — 租户相关类型
├── utils/        # *.utils.ts   — tenantId 解析、租户配置工具
└── index.ts
```

## 依赖约束

**允许：** `@vxture/shared` · framework-agnostic，层级通用约束见 [packages/index.md § Core 层通用约束](../index.md)

## 核心设计约束

- tenantId 解析支持多来源：请求头 / 子域名 / 路径参数
- 上下文传播使用 AsyncLocalStorage（Node.js）
- 不查询数据库，不持久化任何状态
- 租户配置查询通过回调 / 依赖注入方式接收数据源，不硬编码
