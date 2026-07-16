# 数据库设计索引

> `vxture` 仓库当前只负责平台控制面数据库与平台 Model Platform 计量相关数据。
> 平台控制面数据由 `@vxture/core-database`（Prisma）统一管理；
> vx-worker-02/03/04/05 等业务 worker 上的业务数据库属于外部业务仓库，本文只记录边界，不提供本仓部署依据。

---

## 容器分布

| 容器             | 节点               | 数据库名                     | 管理方                                   | 本仓部署 |
| ---------------- | ------------------ | ---------------------------- | ---------------------------------------- | -------- |
| `vx-platform-pg` | VXTURE_DEPLOY_HOST | `vxturestudio_platform_main` | `@vxture/core-database` + model-platform | 是       |

`@vxture/service-model-platform` 当前部署在 VXTURE_DEPLOY_HOST，使用平台库中的 `model` / `commerce` 数据完成模型授权、配额校验和用量计量。它不是业务 worker 数据库。

业务数据库（Varda 未来迁移、Ruyin 等外部业务）由外部业务仓库定义和部署，不在本仓容器分布表维护。

---

## 平台库 Schema 分布（`vx-platform-pg`）

| Schema     | 表数 | 主要消费方                             |
| ---------- | ---- | -------------------------------------- |
| `identity` | 10   | auth-bff, website-bff                  |
| `iam`      | 6    | auth-bff, console-bff                  |
| `tenant`   | 7    | website-bff, console-bff               |
| `product`  | 7    | admin-bff                              |
| `commerce` | 12   | admin-bff, console-bff, model-platform |
| `model`    | 5    | admin-bff, console-bff, model-platform |
| `ops`      | 9    | admin-bff                              |
| `support`  | 4    | admin-bff                              |

권위参考：`packages/core/database/prisma/schema.prisma`

---

## 外部业务库边界

业务库不存储平台数据（用户、订阅、支付等），只保留必要的平台关联 ID。具体库名、schema、迁移命令、备份、beta/prod 隔离策略由外部业务仓库维护。

---

## 架构原则

**平台库只有 Prod**：订阅、支付、租户、权限数据不允许双份。

**业务库支持 beta/prod 双环境**：这是外部业务仓库职责，不在本仓部署或迁移。

**禁止跨容器 JOIN**：跨库关联通过 BFF 聚合层（application code），禁止 DB 层跨容器 JOIN。

---

## 平台库变更流程

```bash
# 1. 修改 packages/core/database/prisma/schema.prisma
# 2. 生成并应用迁移
pnpm --filter @vxture/core-database migrate:dev

# 首次对接已有 DB（一次性）
npx prisma migrate resolve --applied "0001_schema_migration" \
  --schema=packages/core/database/prisma/schema.prisma
```

详见 [`docs/40-implementation/packages/core/database.md`](../../40-implementation/packages/core/40-database.md)。

业务库（例如外部 Ruyin，或未来迁移后的 Varda）迁移命令由外部业务仓库维护；本仓不得据此执行业务 worker 数据库部署。

---

## 完整部署架构

见 [`docs/50-deployment/08-code-environment-map.md`](../../50-deployment/08-code-environment-map.md) — 明确本仓与外部业务仓库的数据库和部署边界。

---

## 设计草案

待确认的表结构设计文档（尚未进入 Prisma schema）：

| 文档                                                                                      | 内容                                         |
| ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| [`../design/data_platform_100_architecture.md §14`](../data_platform_100_architecture.md) | `admin.governance_record` 统一治理视图表设计 |
| [`../design/data_platform_100_architecture.md §15`](../data_platform_100_architecture.md) | `support.ticket` 工单表 + 运营待办聚合方案   |
