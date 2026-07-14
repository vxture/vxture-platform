# Sharing 域细化设计：grants / 物化可见集（字段级）（data_sharing_200）

<!-- data-architecture: target-state -->

> 状态：v1 草案 · 编号 `data_sharing_200`（细化设计层）· 待评审 · 未实施
> 上级权威：[`data_sharing_100_architecture.md`](data_sharing_100_architecture.md)（域架构）、[`data_platform_100_architecture.md`](data_platform_100_architecture.md) §2.2.4 八条铁律
> 模型语义权威：[`product_110_sharing-isolation.md`](product_110_sharing-isolation.md) §8（本文把 §8.5 草表落到字段级，语义冲突时以 §8.3 谓词为准）
> actor 约定：沿用 [`data_commerce_200_metering.md`](data_commerce_200_metering.md) §0.1（跨 realm = `*_by_type` + `*_by_id` loose 对）

---

## 0. 命名与总量

schema = `sharing`（单数）；表 = `grants` / `visible_set_current` / `visible_set_refresh`（复数、无前缀；`visible_set_refresh` 语义为集合级锚，沿用 `_current` 姊妹命名族）。共 3 表：1 SoT + 2 物化（非 SoT，可 TRUNCATE 全量重建）。

## 1. `grants`（SoT：一行 = 一条授权）

| 字段                        | 类型         | 约束                                               | 说明                                                                                                    |
| --------------------------- | ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                        | uuid         | PK                                                 |                                                                                                         |
| `tenant_id`                 | uuid         | NOT NULL, FK→`tenancy.tenants.id`                  | org 内机制硬约束（§8.3；一致性触发器见 §3）                                                             |
| `resource_type`             | varchar(32)  | NOT NULL, CHECK(dataset/knowledge_base/skill)      | 三类 day-one 建全（v1 只有 dataset 有消费者）                                                           |
| `resource_product_id`       | uuid         | NOT NULL, FK→`product.products.id`                 | 资产归属键之 product                                                                                    |
| `resource_workspace_id`     | uuid         | NOT NULL, FK→`tenancy.workspaces.id`               | 资产归属键之 WS（= 发起授权的属主 WS）                                                                  |
| `resource_ref`              | varchar(128) | NOT NULL                                           | 业务面资产 id，**loose**（铁律一边界#1，不建 FK 不校验存在性）；同面内格式由属主产品自定                |
| `grantee_type`              | varchar(16)  | NOT NULL, CHECK(workspace/product/org_all)         | T 级 org 库可见性 = `org_all` 预设 grant（§8.3，非独立机制）                                            |
| `grantee_workspace_id`      | uuid         | NULL, FK→`tenancy.workspaces.id`                   | 仅 `grantee_type='workspace'` 时非空                                                                    |
| `grantee_product_id`        | uuid         | NULL, FK→`product.products.id`                     | 仅 `grantee_type='product'` 时非空；语义 = 本 org 内经该 product 访问的任意 WS 实例（§8.3）             |
| `scope`                     | varchar(16)  | NOT NULL, CHECK(read/retrieve/apply/use)           | 值域按 `resource_type` 参数化（§8.2，跨列 CHECK 见下）；`apply` 蕴含 `retrieve` 在求值层表达            |
| `status`                    | varchar(16)  | NOT NULL DEFAULT `'active'`, CHECK(active/revoked) | 撤销 = 置 `revoked` 保留行（审计）；重新授权 = 新建行，不复活旧行（§8.3）                               |
| `expires_at`                | timestamptz  | NULL                                               | 可选到期，与撤销是两条独立轴（§8.1）；到期不改 `status`，求值/物化按时刻过滤，事件由扫描 Job 补发       |
| `created_by_type`           | varchar(16)  | NOT NULL, CHECK(system/customer/operator)          | §0.1 约定：发起主体常态 = customer（属主 WS 管理员，§8.7），运营代操作/系统预设（org-all 模板）跨 realm |
| `created_by_id`             | uuid         | NULL                                               | loose，按 type 解引用 `account.users` / `admin.operator_accounts`（边界#2 不建 FK）                     |
| `revoked_at`                | timestamptz  | NULL                                               | 撤销时刻（status=revoked 时非空）                                                                       |
| `revoked_by_type`           | varchar(16)  | NULL, CHECK(system/customer/operator)              | 撤销主体：属主 WS 管理员 / org 管理员一键回收 / 运营 / 系统级联（如 DataSource 解绑）                   |
| `revoked_by_id`             | uuid         | NULL                                               | loose，同上                                                                                             |
| `created_at` / `updated_at` | timestamptz  | NOT NULL DEFAULT now()                             | 行仅两次可变写（建、撤销），无独立 history 表；全量轨迹归 `support.audit_logs`（§0.1）                  |

**跨列 CHECK**（把 §8.2/§8.3 写进结构，防实现分叉）：

```sql
-- grantee 形态一致性
CHECK (
     (grantee_type = 'workspace' AND grantee_workspace_id IS NOT NULL AND grantee_product_id IS NULL)
  OR (grantee_type = 'product'   AND grantee_product_id   IS NOT NULL AND grantee_workspace_id IS NULL)
  OR (grantee_type = 'org_all'   AND grantee_workspace_id IS NULL     AND grantee_product_id   IS NULL))
-- scope × resource_type 参数化（§8.2）
CHECK (
     (resource_type = 'dataset'        AND scope = 'read')
  OR (resource_type = 'knowledge_base' AND scope IN ('retrieve','apply'))
  OR (resource_type = 'skill'          AND scope = 'use'))
-- 撤销字段成组
CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
```

**索引**：

- `UNIQUE NULLS NOT DISTINCT (tenant_id, resource_type, resource_product_id, resource_workspace_id, resource_ref, grantee_type, grantee_workspace_id, grantee_product_id, scope) WHERE status = 'active'`——同一 (resource, grantee, scope) 至多一条活跃行（重授新行的前提 = 旧行已 revoked；不同 scope 并存合法，就高合成）；
- `idx (tenant_id, grantee_workspace_id) WHERE status='active'` / `idx (tenant_id, grantee_product_id) WHERE status='active'` / `idx (tenant_id, grantee_type) WHERE status='active' AND grantee_type='org_all'`——物化重算的三条命中路径；
- `idx (resource_product_id, resource_workspace_id, resource_ref)`——属主视角列表/撤销、资产删除级联撤销反查。

**求值谓词**（重算/求值统一按 §8.3，此处只登记实现注记）：`status='active' AND (expires_at IS NULL OR expires_at > now())` 为行有效性前置；属主自授（grantee 指向属主自身）不禁止、无效果（属主访问是结构判定，不经 grant）。

## 2. 物化可见集（非 SoT，惰性 TTL 缓存）

### 2.1 `visible_set_current`（一行 = 调用方 × 可见资源）

| 字段                    | 类型         | 约束                                 | 说明                                                                                                                         |
| ----------------------- | ------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | uuid         | PK                                   |                                                                                                                              |
| `tenant_id`             | uuid         | NOT NULL, FK→`tenancy.tenants.id`    |                                                                                                                              |
| `workspace_id`          | uuid         | NOT NULL, FK→`tenancy.workspaces.id` | 调用方 WS（按调用方预展开，对齐 `entitlement_current` 键法）                                                                 |
| `product_id`            | uuid         | NOT NULL, FK→`product.products.id`   | 调用方 product                                                                                                               |
| `resource_type`         | varchar(32)  | NOT NULL, CHECK 同 `grants`          |                                                                                                                              |
| `resource_product_id`   | uuid         | NOT NULL, FK→`product.products.id`   |                                                                                                                              |
| `resource_workspace_id` | uuid         | NOT NULL, FK→`tenancy.workspaces.id` |                                                                                                                              |
| `resource_ref`          | varchar(128) | NOT NULL                             | loose，同 SoT                                                                                                                |
| `scope`                 | varchar(16)  | NOT NULL, CHECK 同 `grants`          | 多 grant 就高合成后的单值（§8.3）                                                                                            |
| `expires_at`            | timestamptz  | NULL                                 | **贡献 grant 中最早的** `expires_at`——保守失效：到期即视同缺失触发重算，弱 scope 若仍有效由重算恢复（default-deny 方向安全） |
| `refreshed_at`          | timestamptz  | NOT NULL DEFAULT now()               |                                                                                                                              |

约束/索引：`UNIQUE (workspace_id, product_id, resource_type, resource_product_id, resource_workspace_id, resource_ref)`（UPSERT 键）；`idx (tenant_id)`（org 级失效删除路径）。

### 2.2 `visible_set_refresh`（新鲜度锚：每调用方一行）

| 字段                        | 类型        | 约束                                 | 说明         |
| --------------------------- | ----------- | ------------------------------------ | ------------ |
| `id`                        | uuid        | PK                                   |              |
| `tenant_id`                 | uuid        | NOT NULL, FK→`tenancy.tenants.id`    |              |
| `workspace_id`              | uuid        | NOT NULL, FK→`tenancy.workspaces.id` |              |
| `product_id`                | uuid        | NOT NULL, FK→`product.products.id`   |              |
| `refreshed_at`              | timestamptz | NOT NULL DEFAULT now()               | TTL 判定基准 |
| `created_at` / `updated_at` | timestamptz | NOT NULL DEFAULT now()               |              |

约束：`UNIQUE (workspace_id, product_id)`。存在意义：**空可见集是合法状态**，无锚行则零命中调用方每次读都全量重算；锚行让"新鲜的空集"可判定。

### 2.3 维护语义

- **读（解析 API）**：锚行存在且 `refreshed_at > now() - TTL`（TTL 服务端配置，默认 30s）→ 读 `visible_set_current`（过滤 `expires_at IS NULL OR expires_at > now()`）；否则从 `grants` 重算（三条命中路径 UNION + 就高合成）→ 单事务 DELETE 旧行 + INSERT 新行 + UPSERT 锚 → 返回。重算幂等，并发重复重算可接受（行为收敛，不加 advisory lock，量级不支持前置优化）；
- **写失效（同步，与 grant 写同事务）**：按 grantee 维度删锚（删锚即失效，行可留待重算清理）——`workspace` → 删 `(grantee_workspace_id, *)` 锚；`product` → 删 `(tenant 内 *, grantee_product_id)` 锚；`org_all` → 删该 `tenant_id` 全部锚；
- 两表可整体 TRUNCATE 重建，不做备份/迁移对象。

## 3. 一致性触发器（登记，随 M5 建库进 deferred-ddl）

FK 只能保证行存在，保不住"org 内机制"三角一致。对齐既有 owner 一致性触发器模式（`data_platform_300` 登记项）：

| 触发器                        | 校验                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trg_grants_tenant_coherence` | `resource_workspace_id` 与 `grantee_workspace_id`（如非空）均属于 `tenant_id`——**跨 org grant 在结构上不可写入**（product_110 §3.1 硬边界的存储层兜底） |
| `visible_set_current` 同款    | `workspace_id` / `resource_workspace_id` 属于 `tenant_id`（物化行同守，防重算代码回归）                                                                 |

## 4. invalidate 事件派生（C3 §4.2，P4.3 实施）

复用 `provisioning.webhook_deliveries` 投递基建（[`data_commerce_220`](data_commerce_220_provisioning.md) §2：队列/lease/HMAC/退避/死信照用，`provisioning_id`/`provisioning_version` 置 NULL——该表 day-one 即为非开通类事件留位）：

| 项                | `grant.invalidated`（新增 event_type）                                                                                                                                                                          | entitlement invalidate（收 P2.4 债）                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 触发              | ① grant 撤销（与撤销同事务入队）；② 到期扫描 Job（分钟级，扫 `status='active' AND expires_at <= now()` 且未发过事件的行）                                                                                       | 订阅生命周期写点（P2.3b 已有扇出钩子），事件型 = 既有 `subscription_changed`                                                                                               |
| 目标              | 资产面产品 `resource_product_id` 的 webhook 端点（`product.product_webhooks`）                                                                                                                                  | 覆盖该 WS 的各 product 端点                                                                                                                                                |
| payload           | `{grant_id, tenant_id, resource: {type, product, workspace_id, ref}, grantee: {...}, scope, reason: revoked\|expired}`                                                                                          | `{workspace_id, products: [...]}`（product_200 §4.2 契约）                                                                                                                 |
| `workspace_id` 列 | = `resource_workspace_id`（表列 NOT NULL，取资产属主 WS）                                                                                                                                                       | = 订阅 WS                                                                                                                                                                  |
| 幂等键            | **实施定稿（2026-07-07）**：`{grant_id}:grant.invalidated:{reason}`——行仅一次撤销/一次到期（重授=新行、`expires_at` 建行后不改），grant_id 已含实例判别，无需时刻源（较设计稿 hash 方案简化，Job 重扫天然去重） | **实施定稿**：`subchg:{subscription_id}:{product_id}:{changeId}`（changeId=每次写操作一枚 uuid；四 uuid 全拼超 varchar(128)，subscription_id 全局唯一故不携 workspace_id） |
| 产品端义务        | 验签 + 幂等 + 清缓存；Karda/Arda 另按派生边 re-scope（§8.6，产品侧实现）                                                                                                                                        | 清 C2 缓存重拉                                                                                                                                                             |

## 5. 跨 schema FK 速查表

| 从                                                     | 到                                           | 类型  | 依据                     |
| ------------------------------------------------------ | -------------------------------------------- | ----- | ------------------------ |
| `grants.tenant_id` / 两处 `workspace_id`               | `tenancy.tenants/workspaces`                 | 真 FK | 普通引用（铁律一）       |
| `grants.resource_product_id` / `grantee_product_id`    | `product.products.id`                        | 真 FK | 沿用先例                 |
| `grants.resource_ref`                                  | 业务面资产                                   | 裸值  | 边界#1（跨面 loose）     |
| `grants.created_by_id` / `revoked_by_id`               | `account.users` \| `admin.operator_accounts` | 裸值  | 边界#2（按 type 解引用） |
| `visible_set_current` / `visible_set_refresh` 各引用列 | 同上 tenancy/product                         | 真 FK | 普通引用                 |

## 6. 待办 / 开放项

- `revoked` 旧行留存/归档策略待定（量级预期低，先不设）；
- org-all 预设 grant / WS onboarding 共享模板的播种流程（100 §5 非目标，另线）；
- ~~到期扫描 Job 的"未发过事件"判定实现~~ ✅ 已定（P4.3，2026-07-07）：查 `webhook_deliveries` 幂等键（SoT 不加列）；无 webhook 登记的产品不成为候选（enqueue 与 sweep 均以 `product_webhooks` 存在为前提，防死信噪音与扫描不收敛）；
- `UNIQUE NULLS NOT DISTINCT` 需 PG15+（生产 = postgres:18，满足）。
