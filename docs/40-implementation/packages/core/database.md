> ⚠️ **数据模型部分已过时（2026-07-01）** — 平台数据架构以 **[`../../design/data_platform_100_architecture.md`](../../../30-design/data_platform_100_architecture.md)** 为权威，本文所述 schema 设计勿再参考。（注：`@vxture/core-database` **包本身仍在用**——其运行时 Prisma 客户端从统一 schema 重生成，见 v2 §18.1.4；包 API 文档另行维护，不随本文退役。）

# @vxture/core-database

> ⚠️ 待大版本重构 | 迁移自 `packages/core/database/AGENTS.md`
> 架构层参考：[`docs/30-design/architecture/03-core-layer.md`](../../../30-design/architecture/03-core-layer.md)
> 数据库设计：[`docs/30-design/db/00-index.md`](../../../30-design/db/00-index.md)

---

## 包信息

| 项     | 值                        |
| ------ | ------------------------- |
| 包名   | `@vxture/core-database`   |
| 路径   | `packages/core/database/` |
| @layer | `Infrastructure`          |

## 职责

**唯一职责**：用 Prisma 管理平台主库（`platform_main`）中 8 个 PostgreSQL schema 的 DDL（表结构）。

- 不提供 Prisma Client 给业务层（各 service 自行决定是否引入）
- 不包含任何查询逻辑、业务逻辑
- 是所有表结构变更的**唯一入口**

## 覆盖 Schema

| Schema     | 表数 |
| ---------- | ---- |
| `identity` | 10   |
| `iam`      | 6    |
| `tenant`   | 7    |
| `product`  | 7    |
| `commerce` | 12   |
| `model`    | 5    |
| `ops`      | 9    |
| `support`  | 4    |

## 常用命令

```bash
# 查看 drift
pnpm --filter @vxture/core-database migrate:dev

# 首次对接已有 DB（执行一次）
npx prisma migrate resolve --applied "0001_schema_migration" \
  --schema=packages/core/database/prisma/schema.prisma

# 生成 Prisma Client（可选）
pnpm --filter @vxture/core-database generate
```

## 修改规范

1. 只改 `prisma/schema.prisma`，禁止直接手写 migration SQL
2. 改完后运行 `migrate:dev` 让 Prisma 生成 migration 文件
3. 结构性变更必须评估对现有 pg.Pool 查询代码的影响
4. 新增表后，同步更新 `docs/30-design/db/` 对应设计文件

## 禁止的依赖

- 任何业务包（`service-*` / `bff-*` / `agent-*`）
- `@vxture/design-system` / `platform-*`
- 浏览器 API
