# 目标态数据底座落地 + 切换 runbook（SQL-DDL 单一权威 · 迁移机制 · iam/appoidc 备份恢复）

> 状态：实施指导（3\*\* 层）· 编号 `data_platform_320` · 依据 = 全套 `data_*` 目标态设计（v1）+ 八条铁律（[`data_platform_100_architecture.md`](./data_platform_100_architecture.md) §2.2.4）
> 前提（用户 2026-07-04 确认）：**开发阶段、无技术债、无用户，仅内部几个业务对接互通**（如 ruyin OIDC）。按铁律三：**全库 reset + reseed**；唯一保留 = 原 `iam`（新 `appoidc`）的**业务互通数据**（OIDC client + 签名密钥），其余可全部丢弃。
> **地基决策（2026-07-04 用户拍板）**：DDL 机制 = **手写 SQL DDL 单一权威**，取代 `prisma db push`。论证与迁移机制见 §0–§2。
> ⚠️ 执行门控：**生产库 reset 不可逆**——须在①新 DDL 建成并本地验证（**已完成**，§1）、②`appoidc` 备份已取且校验之后，才在 worker-01 执行，且**须用户显式授权**（任务 4，§6）。

---

## 0. 为什么 SQL DDL 能当单一权威（决策论证）

**核心判据**：_一个 artifact 能当唯一 source of truth，前提是它能表达"全部真相"。_ Prisma 的建模语言表达不了全部 Postgres 结构，真相就必然外溢到别处——**分裂是表达力天花板决定的结构性必然，不是纪律问题**。

### 0.1 心智模型：有损投影 vs 无损表示

记真实库 schema = **S**（含分区 / 触发器 / 跨 schema·复合 FK / 函数 …）。

- **Prisma model = S 的有损投影 P(S)**：只能表示"表 / 列 / 简单索引"那部分，**丢掉**分区、触发器、跨 schema FK。`db push` 操作 P(S)，于是实库 = `P(S) ∪ 裸SQL补的那块`，**没有任何单一文件 = S**。当前遗留即此：`schema.prisma`(P(S)) + `00-bootstrap.sql` + `10-deferred-ddl.sql`（漏出的那块）+ 一个没人用的生成 client + 47 处 repo 手写 `schema.table`。分区甚至**从没进过真相**（db push 做不了被砍，设计说分区、库里没分区 = 假分区）。
- **SQL DDL = S 的无损表示**：Postgres 支持的一切都能用 SQL 写，**表达力零缺口**。`.sql` 文件**就是 S**（至多差 apply 顺序）。一个 artifact = 完整的 S → 权威**才可能**只信一处。

> 一句话：Prisma 当权威 = 拿缺块的地图当疆域；SQL 当权威 = 地图与疆域同构。

### 0.2 "保证"的确切含义（两层）

- **必要条件（SQL 给的硬保证）**：单一权威要求"存在一个能表达全部结构的 artifact"。Prisma **不满足**→ 单一权威在其下**逻辑上不可能**；SQL **满足**→ **移除了不可能性**。这才是"保证"——保证前提，不是自动执行。
- **仍需纪律 + 机制（SQL 不自动给）**：① 全部结构进 `ddl/`，下游（类型 / 文档）一律**从库派生**（Prisma 若留 = `db pull` introspection，箭头单向）；② 上线后不能 reset，须补**增量迁移机制**（§2）。

### 0.3 派生方向单向化

```
        权威                         下游（派生，禁反向当权威）
  deploy/database/ddl/*.sql  ──apply──▶  DB（S 的物化）──db pull──▶  schema.prisma（仅类型生成，可弃）
                                              └─────────────────────▶  服务 repo 引用的 schema.table（须跟随，见 §5）
```

---

## 1. 已建成：全部目标态 DDL（真库验证通过）

**权威目录**（取代 `schema.prisma` + `00-bootstrap` + `10-deferred-ddl`）：

- **平台库** `deploy/database/ddl/`（18 schema）：`00_schemas`（schema + 可视码序列）/ `10_account`…`80_admin`（各域表 + 域内 FK 内联）/ `90_cross_schema_fk`（全部跨 schema·复合 FK，铁律一）/ `95_triggers`（plan 锁 + append-only）/ `96_partitions`（月分区 + DEFAULT）/ `apply.sh`（clean-baseline runner）。
- **Model Platform DB** `deploy/database/ddl-modelruntime/`（独立库 `key`/`reqlog`/`routing`，跨库零 FK，密钥 AES-256 加密永不明文）。

验证（本地 postgres 18.3，`apply.sh` 顺序全量 apply）：**平台库 18 schema·130 表(含分区子表)·190 FK·38 触发器·3 分区父；Model Platform DB 23 关系·1 域内 FK·0 跨库 FK·2 分区**。零错误；append-only / 复合 FK 不变量实测生效。

> 目标 schema 全集：`account·identity·credential·kyc·tenancy·access·appoidc·session·loyalty`(identity 9) · `metering·billing·provisioning·promotion`(commerce 4) · `product·model·safety·support·admin`(其余 5)。独立库 `key·reqlog·routing`。`varda` datasource 不变。

---

## 2. 迁移机制：dev clean-baseline，prod 增量（让单一权威在生产也长久成立）

单一权威的"另一半"——**如何在不能 reset 的生产库里保持 `ddl/` 为权威**。

### 2.1 开发阶段（现在，铁律三）：clean-baseline

- 权威 = `ddl/` 目录；DB = 它的精确重放。演进 = **`apply.sh --reset`**（DROP 全 schema + 重 apply + reseed）。无迁移历史负担，改结构直接改 `ddl/` 文件。
- 表文件 create-once（非 IF NOT EXISTS，重复建报错=有意，防静默漂移）；`00`/`90`/`96` 幂等。

### 2.2 正式上线后（铁律三开关翻转）：desired-state + 自动增量迁移

生产不能 reset，须把"改 `ddl/`"安全落到运行库。方案（desired-state 优先，保 `ddl/` 仍是唯一可读权威）：

1. **`ddl/` 冻结为 v1 baseline**（首次一次性建库）。
2. 之后每次结构变更：**改 `ddl/` 对应域文件（权威）**，由**声明式迁移工具**据"当前库 ↔ 目标 `ddl/`"的差异**自动生成有序 ALTER 迁移** apply 到生产，并记 `schema_migrations` 应用账本。
3. **推荐工具 = Atlas**（`ariga/atlas`）：天然为"SQL schema 作 desired-state → 自动 diff 生成/apply 迁移 + 内建 drift 检测"而设计，与本决策严丝合缝。**回退方案** = 手写编号迁移 `migrations/NNNN_*.sql` + 极简 runner + `schema_migrations` 账本。
4. **绑定不漂移**：CI 断言"从 `ddl/` 新建的库" ≡ "baseline + 全部迁移后的库"（结构 diff 为空）——两者永不背离，`ddl/` 始终是可读权威、迁移只是把生产搬过去的机械路径。

> 现状：**§2.1 那一半已就位（`apply.sh`）；§2.2 随上线补**（铁律三刻意延后）。本节即"上线迁移机制方案"的决策依据。

---

## 3. Prisma / SQL-DDL 双权威残留清理（保证单一权威，随任务 3 执行）

退役所有"与 `ddl/` 竞争的旧 schema 权威"，让派生方向单向（§0.3）：

| 残留                                                                                                       | 处置                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `deploy/database/prisma/schema.prisma` + `packages/core/database/prisma/schema.prisma`（旧 8-schema 权威） | **退役为权威**：加 SUPERSEDED 头（指向 `ddl/`，声明仅 `db pull` 类型产物、禁手编当权威）；生产切换后由 `db pull` 从新库重生成 |
| `deploy/database/prisma/00-bootstrap.sql` + `10-deferred-ddl.sql`（碎片 DDL）                              | SUPERSEDED 头，指向 `ddl/`；不再 apply                                                                                        |
| `deploy/scripts/22-run-platform-migrations.sh`（db push runner）                                           | 改指 `ddl/apply.sh`（+ `ddl-modelruntime/apply.sh`），弃 `prisma db push`                                                     |
| seed（`seed-catalog.mjs` 等，旧名 iam.role/oidc_client…）                                                  | 改写新名（§4）                                                                                                                |
| 服务 `pg-*.repository.ts` 硬编码旧 `schema.table`（~47 文件）                                              | 锁步改新名（§5）                                                                                                              |
| 护栏                                                                                                       | 加 linter 规则：flag 旧 schema 名（iam/旧 commerce 前缀等）在 repo/seed 出现 = 残留告警                                       |

---

## 4. seed 改写

现 seed（`deploy/database/prisma/seed-*.mjs`）按旧名 seed（`iam.role`/`iam.permission`/`iam.oidc_client`/`iam.signing_key` + product/model/ops catalog）。改写为新名：`access.roles`/`access.permissions`/`appoidc.oidc_clients`/`appoidc.signing_keys` + `product.*`/`model.*`/`admin.settings` 等。改后对"新 DDL 临时库 + seed"验证跑通。iam 之外的平台 catalog 全量 reseed；appoidc 业务互通数据走 §6 备份恢复（不由 seed 造）。

> **seed DoD（2026-07-05 复盘 §9 补，硬规）**：「seed 改写完成」不止于"把当时已有的 seed 移植到新名"——必须**逐表核对设计文档的基线数据清单**（operator RBAC 目录 = data_admin_200 §4、access 租户目录 = data_identity_200 §6、oidc_clients、oauth_providers、kyc/loyalty/product/model catalog），且基线覆盖以 `30-verify-platform-baseline.sh` 的活库断言为准（挂 db-init 收尾强制跑，见 §9.5-③）。仅"seed 脚本自身跑绿"不构成完成。

---

## 5. 服务锁步（代码工作线）

运行时 = 手写 `pg-*.repository.ts` 硬编码 `schema.table`（Explore 测绘：~47 文件、65 处；`@vxture/core-database` 生成 client 0 服务引用）。重命名须逐文件改旧名→新名并 CI 绿。按域分批（identity/commerce/product/ops/support/bff），建旧→新映射表统一 sweep。注：本工作线原为"仅文档"（[[feedback_scope]]），落地阶段扩到代码。

> **纳入锁步：两 realm RBAC 字段统一的列重命名**（2026-07-04，data_identity_200 §6 / data_admin_200 §1）。DDL 已改，须锁步的消费代码（raw SQL 字符串，TS 编译不报错、仅运行时对新库失败）：
>
> - `admin.operator_role`：`name_en`→`role_name`、`name_i18n_key`→`role_name_key`、`description_i18n_key`→`description_key`——`bff/admin-bff`（`auth.service`/`admin-roles.router`/`platform-admins.router`）、`services/platform/ops/…/pg-ops.repository.ts`。
> - `access.roles.code`→`role_code`、`access.permissions.code`→`perm_code`——`bff/admin-bff`（`accounts.router`/`tenants.router`）、`services/identity/organization/…`（repo/service/types）。
>
> 属 **bucket 3 应用端** 工作；cutover gated，锁步完成前不部署新库。（superseded 的 `packages/core/database/prisma/*` 不改，随 §3 prisma 退役。）

---

## 6. iam（→ appoidc）备份 + 全库 reset + 恢复（任务 4，**须用户授权**）

**唯一需跨 reset 存活的数据**：`iam.oidc_client`（ruyin 等 RP 注册）+ `iam.signing_key`（RS256 JWKS——丢失则已签发 token 失效、ruyin 缓存 JWKS 需重取）。其余 reset 丢弃。

```
① 预备份（reset 前，read-only）：
   -- 含结构+数据（不加 --data-only）：③ 需在一次性 iam schema 内重建旧表后再迁移。
   pg_dump -Fp -t iam.oidc_client -t iam.signing_key \
     vxturestudio_platform_main > /backup/appoidc_seed_<ts>.sql
   校验：dump 含 ruyin 的 oidc_client 行 + ≥1 把 active signing_key。
② reset + apply 新目标态（弃 prisma db push）：
   CONFIRM_RESET=yes DATABASE_URL=... deploy/database/ddl/apply.sh --reset
   CONFIRM_RESET=yes MODELRUNTIME_DATABASE_URL=... deploy/database/ddl-modelruntime/apply.sh --reset
   → 建全 18 schema + 表 + 90 跨FK + 95 触发器 + 96 分区；独立库同理
   → seed（§4，iam 之外的平台 catalog）
③ 恢复 appoidc 业务互通（列映射 iam.oidc_client→appoidc.oidc_clients、iam.signing_key→appoidc.signing_keys）：
   -- 已本地镜像 dry-run 验证（2026-07-04，vx-platform-pg）：14 client 全迁移，
   -- ruyin/console/admin/website 恢复真实 secret，ruyin 经 status='active' 仓库查询命中。
   -- ③a 备份 dump 建的是旧 "iam" schema 对象；先建一次性 iam schema 再载入 dump（重建旧表+数据）。
   CREATE SCHEMA IF NOT EXISTS iam;
   \i /backup/appoidc_seed_<ts>.sql   -- dump 用 "iam"."oidc_client" 限定名，落入本临时 schema
   -- ③b UPSERT 迁移：真实备份行覆盖 seed 占位行（占位 secret 未设）。
   --    变换：is_enabled(bool)→status(enum active/disabled)；NOT NULL 数组列 COALESCE '{}'；
   --    旧独有列无（全映射）；id 省略（占位行保留原 id，仅备份独有 client=arda-beta 取默认 uuid）。
   INSERT INTO appoidc.oidc_clients (
       client_id, client_secret_hash, realm, product_id, release_channel,
       name, display_name, logo_url,
       redirect_uris, post_logout_redirect_uris, allowed_scopes,
       access_token_ttl, refresh_token_ttl, pkce_required,
       slo_participation, back_channel_logout_uri, status,
       created_at, updated_at)
   SELECT client_id, client_secret_hash, realm, product_id, release_channel,
          name, display_name, logo_url,
          COALESCE(redirect_uris,'{}'), COALESCE(post_logout_redirect_uris,'{}'),
          COALESCE(allowed_scopes,'{}'),
          access_token_ttl, refresh_token_ttl, pkce_required,
          slo_participation, back_channel_logout_uri,
          CASE WHEN is_enabled THEN 'active' ELSE 'disabled' END,   -- is_enabled → status
          created_at, updated_at
     FROM iam.oidc_client
   ON CONFLICT (client_id) DO UPDATE SET
       client_secret_hash        = EXCLUDED.client_secret_hash,
       realm                     = EXCLUDED.realm,
       product_id                = EXCLUDED.product_id,
       release_channel           = EXCLUDED.release_channel,
       name                      = EXCLUDED.name,
       display_name              = EXCLUDED.display_name,
       logo_url                  = EXCLUDED.logo_url,
       redirect_uris             = EXCLUDED.redirect_uris,
       post_logout_redirect_uris = EXCLUDED.post_logout_redirect_uris,
       allowed_scopes            = EXCLUDED.allowed_scopes,
       access_token_ttl          = EXCLUDED.access_token_ttl,
       refresh_token_ttl         = EXCLUDED.refresh_token_ttl,
       pkce_required             = EXCLUDED.pkce_required,
       slo_participation         = EXCLUDED.slo_participation,
       back_channel_logout_uri   = EXCLUDED.back_channel_logout_uri,
       status                    = EXCLUDED.status,
       created_at                = EXCLUDED.created_at,
       updated_at                = EXCLUDED.updated_at;
   -- ③c signing_keys（同法；kid 为主键；私钥不在库=secret manager，不动）：
   INSERT INTO appoidc.signing_keys (...)  SELECT ... FROM iam.signing_key;
   -- ③d 清理临时 schema（新库不得留 iam）：
   DROP SCHEMA iam CASCADE;
④ 验证：JWKS 与备份一致（ruyin 无需重取）；ruyin OIDC 授权码闭环；全容器 healthy；服务 type-check/CI 绿。
```

**风险 / 回退**：② 不可逆，执行前确认 ① 备份完好；新 schema 有问题则重跑本 runbook（无用户数据，重灌无损）。签名密钥默认保留（连续性）；若可接受 ruyin 重取 JWKS，可弃 signing_key、reset 后新生成（更简单，须通知 ruyin）。

---

> **28b consume-once（2026-07-05 复盘补丁）**：restore 成功后必须归档 dump（`28b` 已内置 `mv *.restored-<ts>`）。事故：round-1 capture 的固定名 dump 留在 host，round-2/3/4 每次 reset 后 restore 复活 07-02 旧快照，整表覆盖 fresh seed 的 `allowed_scopes`/时间戳（arda phone、arda-beta secret 反复被抹，靠行 `created_at=07-02` 铁证定位）。教训与 §9 同类：**restore 数据源是一次性货物，不是常驻配置**；活库已归档遗留 dump 并 seed 重灌痊愈。

## 7. 里程碑清单（勾选）

- [x] 全套 `data_*` 设计经评审修正、linter 0 error
- [x] **平台库 DDL 建成（18 schema）+ 真库验证**（`ddl/`）
- [x] **Model Platform DB DDL 建成 + 真库验证**（`ddl-modelruntime/`）
- [x] 退役旧 Prisma/DDL 双权威残留（§3）+ 残留护栏 `check-schema-residue`（0）
- [x] seed 改写新名 + 临时库跑通（§4）
- [x] 服务/bff repo 锁步（两轮，残留 0）+ 集成 smoke 验证（修 3+ 运行时 bug）+ 整仓 CI 绿（§5）
- [x] **本地镜像 cutover dry-run 全步实测通过**（reset→seed→恢复 appoidc→验 ruyin；§6 restore SQL 实测入库）
- [x] db-init workflow 改用新 DDL（`28-apply` / `29-seed` / `28b-restore-appoidc`）
- [x] CI/CD 晋升 develop→beta（含上述全部）
- [x] **⛔ 协调 cutover（worker-01，2026-07-04 已执行）**——结构 1:1 落地（106 表/38 触发器/3 分区/189 FK 与 cutover 版 DDL 全吻合）、核心+model-platform 全 healthy；**但 seed 消费了过时基线**（operator RBAC 目录缺失等）→ 复盘见 **§9**
- [x] **⛔ cutover 缺口补投 = 受控 reset round-2（§9.6，2026-07-05 已执行全绿）**：#617 晋升（beta=`2a179f7b`）→ P4 版本闭合 5/5 → `db-init reset`（run 28733359004：pinned、动态 DROP 清 `commerce`、基线戳 `07691cdc`、seed 7 roles/33 perms 全授 + access 10 roles、**baseline audit PASSED**）→ #618 beta→main 锁步部署 → 3 验证全过（0 非 healthy、1c 逐条、日志零真实错误）
- [x] **TD-018 生产切换（2026-07-05，#619/#621）**：97/98 随 round-2 进活库后，`platform-app.env` 覆盖层 + `32-provision-service-db-roles.sh` 完成 5 服务切 `platform_svc`——列锁实弹生效、owner 通道（db-init）零影响，销号记录见 `tech-debt.md` TD-018
- [ ] （上线时）§2.2 增量迁移机制落地（Atlas / 手写编号迁移 + CI 等价断言）

---

## 8. 受控 cutover 执行清单（worker-01 · 维护窗口 · 每步确认）

> **前提（2026-07-04 已就绪）**：develop→beta 晋升（含 db-init 新 DDL）；本地 dry-run 全步实测；集成验证绿；linter 0。备份 = `C:\vxture-worker-03-backup\iam.sql`（+ P2 现网 fresh 备份）。
> ⚠️ **⛔ 步骤不可逆 / 影响生产**，逐一确认再执行。**downtime 窗口 ≈ 步骤 1→2**（几分钟：reset 后旧服务断，直到新码部署完；dev 阶段无外部用户，可接受）。
> **关键顺序**：先 reset（DB→新 schema），再 beta→main（部署新码）——这样新码部署时 schema 已就绪。反之亦断。
> **db-init 的 `ref`**：reset 在 beta→main **之前**跑，须用 `ref=beta`（新脚本 28/28b/29 在 beta，此时 main 还没有）。

### P. 预检（只读，不改任何数据）

- [ ] **P1** worker-01 现状取实有 schema（reset DROP 清单的实际依据）：`ssh vxture-worker-01 'docker exec vx-platform-pg psql -U vxture -d platform_main -c "\dn"'` → 与 18 目标集 ∪ 系统集 diff，**记录 extras**（当前观测 = `commerce`；`iam` 为 appoidc 迁移临时态）。extras 交由步骤 1 的动态 DROP 清除，不逐个硬编码。
- [ ] **P2** 取现网 fresh 备份（冗余保险；db-init 的 28b capture 也会自动 capture）：`ssh vxture-worker-01 'docker exec vx-platform-pg pg_dump -U vxture -t iam.oidc_client -t iam.signing_key platform_main' > appoidc_fresh.sql`；校验含 ruyin 行。
- [ ] **P3** beta tip SHA：`gh api repos/vxture/vxture/git/ref/heads/beta -q .object.sha`（供步骤 1a **db-init `expected_sha`** 与 2b promotion `expected_sha`——两处用**同一个 SHA**，这就是"DB 与代码消费同一版本"的机械保证）。
- [ ] **P4** **版本闭合校验（§9 复盘新增）**：确认 P3 SHA 上「runbook 所依赖的实现」齐备——`git show <SHA>:deploy/database/ddl/apply.sh | grep -c pg_namespace` ≥1（动态 DROP 已实现）、`git show <SHA>:deploy/database/seed/seed-catalog.mjs | grep -c OPERATOR_PERMISSIONS` ≥1（operator RBAC 目录在 seed 内）。**任何一项为 0 = 该 ref 是过时基线，禁止放行**（2026-07-04 cutover 正是缺这一道门）。

### 1. ⛔ reset + seed + 恢复 appoidc（db-init workflow，新 DDL，`ref=beta`）

> ⚠️ **遗留 schema 清理（按实际状态动态清，不硬编码）**：`apply.sh --reset` 现仅 DROP 18 个目标 schema，**不含**旧 8-schema 遗留（本次直连 `platform_main` 见到 = `commerce`；`iam` 另由 28b 流程处理）。**残留集不预设**——不同环境 / 历史演进遗留的 schema 可能不同，逐个硬编码 `commerce, iam` 是脆弱假设。**处置（两步）**：
>
> 1. **先取实际状态**（编码前置）：`\dn` 枚举现网实有 schema，与 18 目标集 ∪ 系统集（`public` / `pg_*` / `information_schema`）diff，**记录 extras**（本次 = `commerce`）。
> 2. **动态 DROP**：`apply.sh --reset` 增一段——DROP **所有「非系统且不在 18 目标集」的 schema**（`DO` 块循环 `pg_namespace`，`EXECUTE 'DROP SCHEMA … CASCADE'`，并打印被删清单）。这样 reset 对**任意**残留自清，`commerce` 只是本次实例；`public` 保留。开发阶段无数据债，CASCADE 消除无损。

- [ ] **1a** 触发：`gh workflow run db-init.yml -f ref=beta -f expected_sha=<P3 SHA> -f action=reset -f confirm=yes`
      → workflow 先断言 checkout HEAD == `expected_sha`（§9.5-①，破坏性 action 强制），再按序：`28b capture`（存现网 oidc_client/signing_key）→ `28-apply --reset`（DROP 18 schema **+ 动态清非目标残留** 重建 `platform_main`）→ `29-seed` → `28b restore`（ruyin 等真 secret UPSERT 回填占位）→ **`30-verify`（活库基线稽查，红即整个 run 红）**。
- [ ] **1b** watch：`gh run watch <run-id> --exit-status` → success。
- [ ] **1c** 确认点（SSH psql；**每条断言逐一执行并记录输出**——2026-07-04 cutover 因选择性执行漏掉了 `commerce=0` 断言，见 §9.3-RC6）：
      `select count(*) from pg_namespace where nspname in ('account','appoidc','metering');` = **3**（新库已建）；
      `select client_id,(client_secret_hash is not null) as s from appoidc.oidc_clients where client_id in ('ruyin','console','admin');` → 三者 **s=t**；
      `select count(*) from pg_namespace where nspname in ('iam','commerce');` = **0**（遗留 schema 已清）；
      `select (select count(*) from admin.operator_permission) as op, (select count(*) from admin.operator_role) as r;` → **op>0 且 r≥7**（seed 基线非空——1a 的 30-verify 已机器断言过，此处人工复核）。
      **⚠️ 此刻旧服务开始报错（旧码查旧表，表已不存在）——预期，downtime 开始。**

### 2. ⛔ beta→main 晋升（构建 `:latest` + 自动部署新代码到 worker-01）

- [ ] **2a** 建 beta→main PR：`gh pr create --base main --head beta --title "Promote beta → main (platform data cutover)" --body "..."`
- [ ] **2b** 触发晋升（生产门：`release_confirmed`+`release_note`）：
      `gh workflow run branch-promotion.yml -f target=main -f pr_number=<PR#> -f expected_sha=<P3 beta SHA> -f release_confirmed=true -f release_note="platform data cutover to 18-schema (coordinated with db-init reset)"`
- [ ] **2c** main push 自动链：`docker-build`（构建 `:latest`，仅受影响服务）→ `deploy-production`（SSH `31-regular-upgrade` 拉新镜像 + `compose up`，**不碰 DB**）。
      watch 两个 run 到 success：`gh run list --workflow=docker-build.yml -L1` / `--workflow=deploy-production.yml -L1` → `gh run watch <id>`。
      **新码 + 新库同时就绪，downtime 结束。**

### 3. 验证（cutover 完成）

- [ ] **3a** 全容器 healthy：`ssh vxture-worker-01 'docker ps --format "{{.Names}} {{.Status}}"'` → vx-auth-bff/console-bff/admin-bff 均 healthy 且镜像为新 `:latest`。
- [ ] **3b** **ruyin OIDC 闭环**：真人/脚本走 ruyin 授权码登录 → token 签发 → 验签成功（JWKS 由 env 注入的签名密钥）。
- [ ] **3c** 抽查 wired 路径：console 登录、租户信息/成员管理、订阅读路径无 500。
- [ ] **3d** 观察日志 5–10 min：`ssh vxture-worker-01 'docker logs --since 10m vx-auth-bff | grep -iE "error|does not exist"'` 无 schema/列错误。
- [ ] **3e** **活库基线稽查绿（§9.5-③）**：`gh workflow run db-init.yml -f ref=<同 P3> -f action=verify -f confirm=yes` → `30-verify-platform-baseline.sh` 全部断言通过（schema 集合 == 18 目标、表数 == DDL、seed 基线非空/全授）。这是 cutover「数据层完成」的机器判定，服务级冒烟（3a–3d）不可替代它。

### 回退

- reset 不可逆，但**无用户数据**（dev 阶段）。若新码/新库有问题：修代码 → 重跑步骤 1（db-init reset，重灌无损）+ 重新部署（deploy-production `workflow_dispatch`）。
- ruyin 等 secret：从 P2/离线备份可再次恢复（28b restore 幂等）。签名密钥 env 注入不变，ruyin 缓存 JWKS 无需重取。
- 极端回退（放弃 cutover）：把 worker-01 部署回退到旧 `:latest`（`deploy-production` 指定旧 `image_tag`）+ 从备份重建旧 8-schema——因已切走，代价高，仅作兜底。

---

## 9. 事故复盘：2026-07-04 cutover「结构满分、seed 过时基线」（2026-07-05 稽查）

### 9.1 现象与定量事实

cutover 后全容器 healthy、readiness 全绿，但活库稽查发现 seed 数据与设计基线不符。**先纠正一个直觉误判：结构是 1:1 落地的**——活库 106 表 = cutover 版 DDL 106 个 `CREATE TABLE`，38 触发器 / 3 分区 / 189 FK 全部吻合；seed 也逐条 ✓ 跑完、无吞错。真正的问题是：**执行是忠实的，基线是过时的**。

> **稽查中的升级发现（本地镜像实测）**："结构 1:1" 仅相对 **cutover 版口径**成立。develop DDL 已有**列级演进**（#609 两 realm 字段统一：`80_admin` `name_en→role_name` 等改名，表数不变）——新 seed 对活库结构直接失败（`column "role_name" does not exist`）。含义有二：① **§9.6 补投不能只跑 seed，必须是受控 reset round-2**（clean-baseline 哲学的正解）；② 计数类断言抓不到列级漂移 → ③ 的稽查加 **DDL 基线指纹**（apply.sh 把 DDL 内容 hash 打戳进 `public.vx_ddl_baseline`，30-verify 同法重算比对，任何演进机器可见）。

| 缺口                               | 活库现状                                                      | 应有（develop 定稿）                                                                                                                               | 性质                                          |
| ---------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| operator RBAC 目录                 | role=2，**permission=0，role_permission=0**（admin 授权断链） | 8 roles + 33 perms + super_admin 全授自检（#609/B9）                                                                                               | **静默缺口**（本复盘主案）                    |
| access 租户 RBAC                   | 9 perms + 6 roles（旧版）                                     | 9 perms + 10 roles（5 角色 ×2 scope）                                                                                                              | 静默缺口（同因）                              |
| `commerce` 孤儿 schema             | 24 旧表残留                                                   | 不应存在                                                                                                                                           | reset 语义缺陷（RC4）                         |
| 97_service_roles / 98_column_locks | 未 apply                                                      | TD-018 服务角色 + 锚点列锁                                                                                                                         | **已知待授权项**，非静默失败                  |
| `appoidc.signing_keys=0`           | 空                                                            | **本就应空**——P0 设计 = env 签名（`OIDC_ACTIVE_KID`+`OIDC_SIGNING_PRIVATE_KEY`），DB 表只服务轮换期 JWKS；seed 有意拒绝假占位；旧库备份同为 COPY 0 | 非缺陷；预期未写进验收清单 → 稽查时误判为故障 |
| sample user 3 表=0                 | 跳过                                                          | `SAMPLE_USER_PASSWORD_HASH` 未设，seed 明示跳过                                                                                                    | 有意行为                                      |

### 9.2 时间线（UTC）

| 时刻         | 事件                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 07-04 01:58  | develop→beta 晋升，beta tip = `ee857f43`（#602 runbook §8，**文档已处方**动态 DROP + 1c 断言；但 seed/apply.sh 仍是 #597 草稿版）         |
| 07-04 02:07  | **db-init reset @ ref=beta**——用 #597 版 seed（无 operator 目录）+ #597 版 apply.sh（无动态 DROP）执行。`commerce` 幸存、operator RBAC 空 |
| 07-04 03:02  | model-platform 修复部署（8f07bf4d），全容器 healthy，宣告 cutover 完成                                                                    |
| 07-04 ~20:22 | **#609（B9）合 develop**：operator RBAC 完整目录进 seed——晚于 cutover ~18h                                                                |
| 07-04 之后   | **#610 合 develop**：apply.sh 动态 DROP 实现——runbook 处方至此才有实现                                                                    |
| 07-05        | 用户查库发现 19 schema（含 commerce），触发本稽查                                                                                         |

### 9.3 根因（四层防线逐层失守）

- **RC1（流程）— 两条工作线赛跑，cutover 没有「seed 内容完成」的前置门**。seed 改写（任务 3）的"完成" = 移植**当时已有**的 seed；operator 目录当时还在 B9 线上未写完。§8 preflight 校验了代码版本与 CI 绿，**没有任何一项校验 seed 覆盖 = 设计基线**。
- **RC2（规范）— 「完成」定义过浅**。[数据模型必须完整] 原则只被执行到 schema 层，未延伸到 seed 基线层；「seed 脚本自身跑绿」被当成了完成（→ §4 DoD 补硬规）。
- **RC3（检查器）— 全部检查器是静态代码扫描，无一看活库**。residue 只扫代码字符串；data-architecture 只校验文档自洽；seed-idempotency 只管幂等不管完整。「活库 ↔ DDL ↔ 设计文档」三方一致性稽查缺位——commerce 孤儿与 RBAC 空洞均落在此盲区。develop 新版 seed 内置的 super_admin 全授自检恰恰没被部署：**自检在 seed 里、门必须建在流水线上**。
- **RC4（设计→脚本语义走样）— reset 实现的是「重建目标」不是「收敛到目标」**。§2 写 clean-baseline（库 == 目标态），apply.sh 落成"DROP 18 目标 schema 再重建"（删除清单 = 目标清单，缺退休清单）。iam 被 28b 显式删、ops 恰好不存在，commerce 漏网。无事后集合断言暴露偏差。
- **RC5（流程）— DB 变更流水线无 SHA 锚定**。branch-promotion 有 `expected_sha` 双确认；db-init（唯一动库的流水线）只 checkout 浮动 `ref=beta`。本次 beta 恰是想要的代码但不是想要的 seed；机制上它随时可能跑到任意版本。
- **RC6（执行纪律）— checklist 断言被选择性执行**。§8 1c 明文含 `iam+commerce=0` 断言，cutover 时只核了新 schema 与 ruyin secret，该断言未执行——执行了就会当场抓到 commerce。逐条执行 + 记录输出必须成为硬要求。

**一句话**：出错不在执行，而在「设计基线 → seed 代码 → cutover 版本 → 验收断言」链上**没有任何环节把"seed 内容 = 设计基线"当作硬约束**；处方（§8 动态 DROP、1c 断言）甚至已写进文档，但实现滞后于消费、断言执行走样——文档驱动实施的闭环断在"实施与验收"两端。

### 9.4 防线失守矩阵

| 防线              | 应拦住什么           | 为什么没拦住                 | 整改（§9.5）   |
| ----------------- | -------------------- | ---------------------------- | -------------- |
| seed DoD          | 过时基线被当成"完成" | DoD 无"逐表核对设计基线"条款 | ②（§4 硬规）   |
| runbook preflight | 消费过时 ref         | 只校代码版本，不校内容能力   | ①+P4           |
| 检查器            | 活库偏离目标态       | 全是静态扫描，无活库稽查     | ③              |
| reset 语义        | 退休 schema 残留     | 删除清单 = 目标清单          | ④（#610 已落） |
| 验收断言          | 残留/空洞出网        | 1c 选择性执行；无机器断言    | ③+⑤+1c 硬化    |

### 9.5 整改五项（状态）

| #   | 整改                                                                                                                                                                                                                                                                                                                                                                                                                                  | 状态                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ①   | db-init 加 `expected_sha` 门（破坏性 action 强制；checkout HEAD 不符即红）                                                                                                                                                                                                                                                                                                                                                            | 本次落地（`.github/workflows/db-init.yml`） |
| ②   | seed DoD 硬规（§4）+ §8 P4/1a/1c/3e 修订                                                                                                                                                                                                                                                                                                                                                                                              | 本次落地（本文档）                          |
| ③   | 活库基线稽查 `30-verify-platform-baseline.sh` + `verify/baseline-assertions.sql`（**DDL 基线指纹**（apply.sh 打戳 `public.vx_ddl_baseline` ↔ verify 重算比对，列级漂移可见）、schema 集合 == 18 目标、表数 == DDL 派生、seed 基线地板/全授），挂 db-init seed/migrate-seed/reset 收尾强制跑 + 独立 `action=verify`。**本地镜像双向实测**：对 cutover 版镜像检出与生产一致缺口（fail 路径）；round-2 reset+新 seed 后全绿（pass 路径） | 本次落地                                    |
| ④   | apply.sh --reset 收敛语义（动态 DROP 非目标 schema）                                                                                                                                                                                                                                                                                                                                                                                  | **已落**（#610，晚于 cutover）              |
| ⑤   | residue 检查器扩 Prisma `@@map`/`@@schema`                                                                                                                                                                                                                                                                                                                                                                                            | **已落**（#609 后，`scanPrisma`）           |

> 触发器/FK 计数暂不进 ③ 断言：97/98（TD-018）在活库的切换独立待授权，计数随之环境相关；TD-018 切换完成后再收紧。

> **设计-执行-验证-确认 闭环（硬规）**：① 期望值从权威源现场派生（DDL 指纹/表数自 `ddl/*.sql`，seed 地板自设计文档），不硬编码；② 执行统一走 db-init（`expected_sha` 锚定版本）；③ **每个动库 action 以 30-verify 实时读库断言强制收尾**（红即 run 红，不可跳过）；④ 确认 = 机器判定 + §8 1c 人工逐条留痕复核。**任何绕过 db-init 的手工库修正，事后必须补跑 `action=verify`**——手工路径不豁免验证环。边界：本闭环当前覆盖平台库；Model Platform DB（ddl-modelruntime）按同模式另行扩展。

### 9.6 缺口补投 = 受控 cutover round-2（✅ 2026-07-05 已执行全绿，过程记录见 §7 里程碑）

活库结构相对 develop 定稿已**列级过时**（9.1 升级发现），seed-only 补投对其直接失败——正解是按 **§8 清单再走一次协调 reset**（本次带上 ①③ 新护栏；本地镜像已彩排全绿）：

1. 本整改分支合 develop → develop→beta 晋升。**P4 版本闭合校验**此时应全过（#609/#610 均已在 develop）。
2. §8 步骤 1：`db-init action=reset -f expected_sha=<P3>` → 动态 DROP 自动清掉 `commerce` 孤儿（无需一次性手工 DROP）→ 新 DDL（含列改名 + 97/98 首次随 apply 全量进入）→ 新 seed（operator/access 目录齐）→ 28b 恢复 appoidc → **30-verify 机器判定绿**。
3. §8 步骤 2：beta→main 晋升，部署与新库锁步的新码（#609 后的 admin-bff 等用新列名）。
4. 数据代价：cutover 后产生的 1 个真实测试账号将丢失（dev 阶段，同 round-1 的 A1 接受面）；appoidc 真 secret 由 capture/restore 保全。
5. ⚠️ 97/98 随 apply.sh 全量首次进活库 = **TD-018 的切换实质发生**——须在放行时一并知会/确认（原独立授权线在 reset round-2 语境下自然合流：全新建库不存在"对已存表单独 apply"的历史顾虑）。
