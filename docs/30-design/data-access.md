# 数据接入层架构设计

> 版本：1.0.0 | 2026-05-15
> 上级文档：[`docs/30-design/data_platform_100_architecture.md`](./data_platform_100_architecture.md)（平台数据架构顶层权威；原 database.md 已并入）
> 执行级别：**强制** — 所有数据库访问必须遵循本文件定义的分层与权限规则

---

## 0. 核心原则

**任何调用方不得绕过 Domain Service 直接读写 Platform DB。**

数据接入层解决三个问题：

| 问题     | 解决方式                                           |
| -------- | -------------------------------------------------- |
| 安全隔离 | PostgreSQL 角色 + GRANT，服务只见自己的 schema     |
| 契约稳定 | DB schema 变化止步于 Repository，不向上传播        |
| 可审计   | 所有写操作经过服务层，集中记录 `support.audit_log` |

---

## 1. 四层访问体系

```
┌──────────────────────────────────────────────────────────────┐
│  第一层：消费层（Browser / Agent Studio）                     │
│                                                              │
│  portals/website   portals/console   portals/admin           │
│  agent-studio/varda                                           │
│                                                              │
│  ► 只通过 HTTPS 与 BFF 通信                                   │
│  ► 永远看不到数据库                                           │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼─────────────────────────────────┐
│  第二层：BFF 层                                               │
│                                                              │
│  gateway-bff  auth-bff  website-bff  console-bff  admin-bff  │
│  varda-bff                                                    │
│                                                              │
│  ► 职责：鉴权、聚合、响应塑形                                  │
│  ► 禁止：任何直接数据库连接、任何裸 SQL                        │
│  ► 访问数据：调用第三层 Domain Service 内部 HTTP API           │
│  ► 例外：admin-bff 报表查询可持有 reporting_ro 只读连接        │
│    （详见 §4）                                               │
└────────────────────────────┬─────────────────────────────────┘
                             │ 内部 HTTP（容器网络）
                             │ Header: x-vxture-internal-auth
┌────────────────────────────▼─────────────────────────────────┐
│  第三层：Domain Service 层（数据接入核心）                     │
│                                                              │
│  identity-service  →  拥有 identity + iam schema             │
│  tenant-service    →  拥有 tenant schema                     │
│  commerce-service  →  拥有 commerce schema                   │
│  product-service   →  拥有 product schema                    │
│  model-service     →  拥有 model schema                      │
│  ops-service       →  拥有 ops schema                        │
│  support-service   →  拥有 support schema                    │
│                                                              │
│  每个 service 内部严格分层：                                  │
│    HTTP Controller → UseCase → Repository → Prisma Client    │
│                                                              │
│  对外暴露：内部 REST API（/internal/* 路由，仅容器网络可达）   │
└────────────────────────────┬─────────────────────────────────┘
                             │ postgresql://（各自独立 PG 角色）
┌────────────────────────────▼─────────────────────────────────┐
│  第四层：物理数据库（PostgreSQL platform_main）               │
│                                                              │
│  PG Role: identity_svc  →  GRANT identity.*, iam.*          │
│  PG Role: tenant_svc    →  GRANT tenant.*                   │
│  PG Role: commerce_svc  →  GRANT commerce.*                 │
│  PG Role: product_svc   →  GRANT product.*                  │
│  PG Role: model_svc     →  GRANT model.*                    │
│  PG Role: ops_svc       →  GRANT ops.*                      │
│  PG Role: support_svc   →  GRANT support.*                  │
│  PG Role: reporting_ro  →  GRANT ALL SCHEMAS SELECT ONLY    │
│                            （admin-bff 报表专用，只读）       │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Schema 所有权（一对一，不共享）

每个 schema 有且只有一个 Domain Service 拥有其读写权限。其他服务必须调用该 service 的 HTTP API，不得绕过。

| Schema             | Owner Service    | 消费方（通过 HTTP API）             |
| ------------------ | ---------------- | ----------------------------------- |
| `identity` + `iam` | identity-service | auth-bff, website-bff, console-bff  |
| `tenant`           | tenant-service   | website-bff, console-bff, admin-bff |
| `commerce`         | commerce-service | console-bff, admin-bff              |
| `product`          | product-service  | admin-bff, console-bff              |
| `model`            | model-service    | admin-bff, model-platform           |
| `ops`              | ops-service      | admin-bff                           |
| `support`          | support-service  | admin-bff                           |

**跨 schema 聚合**：由 BFF 聚合层（aggregator）并发调用多个 service 后合并，不由 service 之间互相调用。

---

## 3. PostgreSQL 角色与权限

每个 Domain Service 对应一个专用 PG 角色，角色只能访问自己的 schema。角色创建脚本纳入 `packages/core/database/prisma/migrations/` 统一管理。

```sql
-- ── identity-service ──────────────────────────────────────────
CREATE ROLE identity_svc LOGIN PASSWORD :'identity_svc_password';
GRANT USAGE ON SCHEMA identity, iam TO identity_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA identity, iam TO identity_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity, iam
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO identity_svc;

-- ── tenant-service ────────────────────────────────────────────
CREATE ROLE tenant_svc LOGIN PASSWORD :'tenant_svc_password';
GRANT USAGE ON SCHEMA tenant TO tenant_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA tenant TO tenant_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tenant_svc;

-- ── commerce-service ──────────────────────────────────────────
CREATE ROLE commerce_svc LOGIN PASSWORD :'commerce_svc_password';
GRANT USAGE ON SCHEMA commerce TO commerce_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA commerce TO commerce_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA commerce
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO commerce_svc;

-- ── product-service ───────────────────────────────────────────
CREATE ROLE product_svc LOGIN PASSWORD :'product_svc_password';
GRANT USAGE ON SCHEMA product TO product_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA product TO product_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA product
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO product_svc;

-- ── model-service ─────────────────────────────────────────────
CREATE ROLE model_svc LOGIN PASSWORD :'model_svc_password';
GRANT USAGE ON SCHEMA model TO model_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA model TO model_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA model
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO model_svc;

-- ── ops-service ───────────────────────────────────────────────
CREATE ROLE ops_svc LOGIN PASSWORD :'ops_svc_password';
GRANT USAGE ON SCHEMA ops TO ops_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA ops TO ops_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ops_svc;

-- ── support-service ───────────────────────────────────────────
CREATE ROLE support_svc LOGIN PASSWORD :'support_svc_password';
GRANT USAGE ON SCHEMA support TO support_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA support TO support_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA support
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO support_svc;

-- ── reporting_ro（admin-bff 报表只读） ────────────────────────
CREATE ROLE reporting_ro LOGIN PASSWORD :'reporting_ro_password';
GRANT USAGE ON SCHEMA
  identity, iam, tenant, commerce, product, model, ops, support
  TO reporting_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA
  identity, iam, tenant, commerce, product, model, ops, support
  TO reporting_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA
  identity, iam, tenant, commerce, product, model, ops, support
  GRANT SELECT ON TABLES TO reporting_ro;
```

**约束：**

- 角色密码通过 Docker Secrets 注入，不写入代码或 `.env` 文件
- `vxture`（超级用户）账号不用于任何应用连接，仅用于 migration 执行
- Model Platform 目标态专属 DB 使用独立角色 `modelruntime_svc`，不使用上述角色；该 DB 属于平台能力，不部署到业务 worker

---

## 4. admin-bff 的特殊处理

admin-bff 是最复杂的消费方，需要跨多个 schema 聚合数据。采用双轨策略：

### 4.1 写操作（严格走 Service API）

| 业务              | 调用                                                 |
| ----------------- | ---------------------------------------------------- |
| 创建/修改运营账号 | `POST ops-service/internal/admins`                   |
| 审核租户          | `PUT tenant-service/internal/tenants/:id/verify`     |
| 核销付款          | `POST commerce-service/internal/invoices/:id/verify` |
| 授权模型          | `POST model-service/internal/grants`                 |
| 创建工单回复      | `POST support-service/internal/tickets/:id/events`   |

写操作绝不绕过 Service，即使需要多步操作，也由 admin-bff 串联 Service API 完成。

### 4.2 读操作（报表查询，持 reporting_ro 只读连接）

admin-bff 因需要跨 schema JOIN 的复杂列表查询（如租户订阅概况、用量汇总报表），可使用 `reporting_ro` 角色建立**只读**连接，但必须：

- 封装在 `src/query/` 目录下的 QueryRepository 类中，**不得**散落在 router 文件里
- 只能执行 `SELECT`，任何写操作走 §4.1
- 每个查询方法必须有明确的 schema 范围注释

```
admin-bff/src/
├── routers/          ← 路由，只聚合数据，不写 SQL
├── query/            ← 报表查询层（reporting_ro，只读 SQL）
│   ├── tenant-overview.query.ts
│   ├── usage-report.query.ts
│   └── subscription-summary.query.ts
└── ...
```

---

## 5. Domain Service 内部分层规范

每个 Domain Service 严格遵循四层分离，禁止跨层调用：

```
HTTP Controller
  ► 接收请求，参数校验（class-validator），返回响应 DTO
  ► 不包含任何业务判断
        │
        ▼
UseCase / Service
  ► 业务规则与流程编排
  ► 调用 Repository，不直接接触 Prisma
  ► 禁止：import { PrismaClient } 或任何 Prisma 类型
        │
        ▼
Repository
  ► 封装所有 Prisma 查询，映射为领域类型（Domain Type）
  ► 每个聚合根对应一个 Repository 类
  ► 禁止：包含业务逻辑（条件判断、规则计算）
  ► 禁止：直接返回 Prisma 生成类型给 UseCase
        │
        ▼
Prisma Client（schema 范围与 PG 角色对应）
        │
        ▼
PostgreSQL（PG 角色权限硬隔离）
```

**领域类型隔离示例：**

```ts
// ✅ Repository 输出领域类型
export interface AccountProfile {
  id: string;
  username: string;
  email: string | null;
  status: 'active' | 'suspended' | 'deleted';
}

// ✅ Repository 内部做 Prisma → 领域类型映射
export class AccountRepository {
  async findById(id: string): Promise<AccountProfile | null> {
    const row = await this.prisma.account.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      status: row.status as AccountProfile['status'],
    };
  }
}

// ❌ 禁止：UseCase 直接操作 Prisma
import { PrismaClient } from '@prisma/client';             // 禁止
const row = await this.prisma.account.findUnique({ ... }); // 禁止（在 UseCase 中）
```

---

## 6. 内部 API 鉴权

BFF 调用 Domain Service、Service 之间相互调用，统一使用内部凭证：

```
Header: x-vxture-internal-auth: <INTERNAL_TOKEN>
```

**规则：**

- `INTERNAL_TOKEN` 通过环境变量注入，不硬编码
- 所有 Domain Service 的 `/internal/*` 路由验证此 Header，401 直接拒绝
- Nginx 层拦截：`/internal/*` 路径不对公网暴露，仅容器网络可达
- `INTERNAL_TOKEN` 统一管理，所有服务共享同一个值（简化运维），定期轮换

---

## 7. BFF 层数据访问强制规则

| 规则                | auth-bff                         | website-bff                      | console-bff                                        | admin-bff                     | varda-bff    | 外部业务 BFF |
| ------------------- | -------------------------------- | -------------------------------- | -------------------------------------------------- | ----------------------------- | ------------ | ------------ |
| 禁止直连 DB（写）   | ✅                               | ✅                               | ✅                                                 | ✅                            | ✅           | ✅           |
| 禁止直连 DB（读）   | ✅                               | ✅                               | ✅                                                 | ⚠️ reporting_ro 只读例外      | ✅           | ✅           |
| 须持有 DATABASE_URL | ❌                               | ❌                               | ❌                                                 | ⚠️ reporting_ro 只读          | ❌           | ❌           |
| 数据来源            | identity-service, tenant-service | identity-service, tenant-service | identity-service, tenant-service, commerce-service | 各 service API + reporting_ro | varda-server | 业务私有后端 |

**auth-bff** 在过渡期内通过打包 `@vxture/service-iam` + `@vxture/service-organization` 间接访问 DB，终态为 identity-service 独立部署后，auth-bff 去掉 DATABASE_URL。详见 §8.2。

---

## 8. 当前过渡状态与演进路径

### 8.1 现状（过渡态，已知偏差）

| 组件             | 当前实现                                                                 | 目标态                                                      | 优先级 |
| ---------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- | ------ |
| auth-bff         | 打包 service-iam + service-organization，持 DATABASE_URL                 | 调 identity-service HTTP API，无 DATABASE_URL               | 中     |
| website-bff      | 同上                                                                     | 同上                                                        | 中     |
| console-bff      | 打包 service-iam + service-organization；billing/subscription 服务为空壳 | 全部调 service HTTP API                                     | 高     |
| admin-bff        | 每个 router 各自 `new Pool()` 直连 DB，写操作无 service 层               | 写操作走 service API；读操作封装在 query/ 层用 reporting_ro | 高     |
| commerce-service | billing/subscription/payment/invoice 目录存在但 src 为空                 | 完整实现并供 console-bff / admin-bff 调用                   | 高     |

### 8.2 演进三阶段

**第一阶段：建立安全基线**

- [ ] 执行 §3 中 PG 角色创建脚本，建立 DB 层权限隔离
- [ ] identity-service 独立部署（代码已有，打包改为独立服务）
- [ ] admin-bff 写操作迁入 ops-service（运营账号、角色权限管理）

**第二阶段：替换 admin-bff 直连**

- [ ] 实现 commerce-service（billing / subscription / payment / invoice）
- [ ] 实现 support-service（ticket 代码已有，需独立部署）
- [ ] admin-bff 写操作全量迁入 service API
- [ ] admin-bff 读操作迁入 `src/query/` QueryRepository（reporting_ro）

**第三阶段：收口 BFF DATABASE_URL**

- [ ] auth-bff 改调 identity-service HTTP API，去掉 DATABASE_URL
- [ ] website-bff 同上
- [ ] console-bff 全量服务化后去掉 DATABASE_URL
- [ ] 审计接入：所有 service 写操作记 `support.audit_log`

---

## 9. 不适用此规则的 DB

| 数据库                                           | 访问模式                         | 说明                                                         |
| ------------------------------------------------ | -------------------------------- | ------------------------------------------------------------ |
| `platform_main.model` / `platform_main.commerce` | model-platform 过渡态受限 Prisma | 当前 Model Platform 合并实现用于模型授权、配额校验、用量计量 |
| `modelruntime_main`                              | model-platform 目标态自管 Prisma | 平台 Model Runtime 专属库；不属于业务 worker                 |
| 业务私有库（如 Varda / 外部 Ruyin）              | agent-server 自管 Prisma         | 业务 DB，通过 BFF 与平台通信                                 |

当前阶段，`model-platform` 部署在 VXTURE_DEPLOY_HOST，作为 Model Platform 的合并实现直接读取 `platform_main.model` 并写入 `platform_main.commerce`，这是过渡态例外。目标态应收口为明确的 model / commerce 内部 API 或专属数据访问契约；无论当前还是目标态，该能力都属于平台侧，不部署到 vx-worker-02/03/04/05 等业务 worker。

---

## 10. 违规检测

dep-cruiser 规则（`docs/60-operations/audit/rules/` 中维护）强制检查：

```
- BFF 包禁止 import pg / @prisma/client（admin-bff query/ 除外）
- Service 包禁止 import 其他 service-*
- Service 包禁止 import bff-*
```

每次 PR 触发 CI 检查，违规 blocking。
