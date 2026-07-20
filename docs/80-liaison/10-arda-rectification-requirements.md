# vxture-arda 反向整改要求(平台线 → arda 任务线)

> **性质**:平台线交付给 arda 任务线的**整改要求清单**(回函)。arda 任务线**自行修正**,平台线**不代做**(治理规范执行模型:各仓自整顿)。
> **完成判定**:每项附**机器可验**命令,**非绿 = 未达标**,无需人主观判断。
> **权威依据(全部已合 vxture-platform `main`)**:`docs/10-standards/140-repo-governance-standard.md` · `docs/30-design/product_240_repo-template.md`(§2.4 / §6 / §9)· `product_200/220/230` · `data_platform_100_architecture.md` §2.3 · `docs/30-design/identity/080-rp-integration.md` §2.11。
> **现状核准**:2026-07-20 对 `D:\MyWebSite\vxturestudio\vxture-arda` 实读(下列"现状"带 arda 文件:行)。
> **排期/授权**:涉活库项(库名/schema/svc 角色/**platform**)须 owner 逐次授权走 `db-init.yml` 通道;顺序建议 = 先标准侧(代码/配置/CI)后活库迁移。
> **孪生**:本清单 = product_240 §9 的交付展开;§9 有增补以本文为准。

---

## A. 标准新增(本轮标准演进,arda 须跟)

| #   | 现状(arda)                                                                                                                  | 要求(依据)                                                                                                                                                                                       | 机检                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| A1  | 仓可见性(GitHub 设置)                                                                                                       | **开发阶段仓库一律 public**,不再要求 private(140 §2,PR #91);若 arda 现为 private → 改 public;确认 secret scanning + push protection 开(公开仓免费全量);清除误标开源残留(公开仓残留 MIT 会真授权) | `gh repo view vxture/vxture-arda --json visibility` = public;`gh api repos/vxture/vxture-arda/secret-scanning/alerts` 可访问 |
| A2  | CI 五 required checks **缺 `test-coverage`**(现:quality-gate/build/audit/gitleaks/static-checks;`.github/workflows/ci.yml`) | 补一个**恒绿 `test-coverage` job**(无单测也占住 context;140 §1 五项集合,PR #85 / §6#8);main-ruleset 五 context 齐                                                                                | `gh api repos/vxture/vxture-arda/rulesets` 的 required checks 含 `test-coverage`;CI `test-coverage` 绿                       |

## B. CONFIRMED 集成 bug(优先修,现会导致管理面越权门控失效)

| #   | 现状(arda)                                                                                            | 要求(依据)                                                                                                                                                                                                                                                                                                                | 机检                                                           |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| B1  | `portals/app/app/entitlement/roles.ts:16` `ADMIN_ROLES = ["owner","admin"]`                           | 平台**从不签发 `admin`**;治理角色值域 = `owner/manager/member/readonly/guest`(`data_identity_200` §6.4 seed)。改为把 **`{owner, manager}`** 判为管理面(否则 `manager` 用户被判非 admin→该能管成员却被拒);见 080-rp §2.11 codify(§6#27)                                                                                    | roles.ts 判定含 manager;单测:`manager` → 管理面可达            |
| B2  | `roles.ts:19` `(roles ?? []).some(r => ADMIN_ROLES.includes(r.toLowerCase()))` —— **不剥 scope 前缀** | token 实发 **scope 前缀数组** `["org:owner","workspace:owner"]`(源码 `access-claims.ts` 确认,080-rp §2.11);消费方**必须剥 `org:`/`workspace:` 前缀**再判。现逻辑拿裸 `owner` 比对 → `workspace:owner` **判非 admin**(owner 都进不去管理面)。改按前缀解析:admin ∈ `{org:owner, workspace:owner, workspace:manager}`(§6#28) | 单测:token `roles=["workspace:owner"]` → isWorkspaceAdmin=true |

> B1+B2 合起来看:当前 arda 对**任何**治理角色都判非 admin(owner 带前缀不匹配、manager 不在表)→ 管理面对所有人 fail-closed 锁死。两条一起修。

## C. 数据层(重;涉活库,须 owner 授权走 db-init)

| #   | 现状(arda)                                                                                   | 要求(依据)                                                                                                                                                                                                                                                                                                                  | 机检                                                                               |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| C1  | `POSTGRES_DB=arda`、`DATABASE_URL=...@arda-db:5432/arda`(`.env.example:81/82/187/188`)       | 迁库名 **`vxturebiz_arda_{beta,prod}`**(data_platform_100 §2.3 契约,PR #83)                                                                                                                                                                                                                                                 | `psql \l` 见 `vxturebiz_arda_prod`/`_beta`;`.env.example` 对齐                     |
| C2  | 单 `public` schema(WorkspaceRef/ProvisioningEvent/UsageRaw 兼职;`00_baseline.sql`)           | 按功能切分:契约表挪进 **`vx_provision`**(app_instance←WorkspaceRef、webhook_delivery/provision_seq←ProvisioningEvent)+ **`local_usage.raw`**←UsageRaw;领域表(Dataset/DataSource/…)归 **arda 领域 schema**;**`local_authz` 可暂空**(arda 现靠 token 治理角色二元 admin、无产品级 RBAC,合规)(data_platform_100 §2.3.1,PR #83) | `check-data-architecture` 扩展规则绿;`\dn` 见 vx_provision/local_usage/领域 schema |
| C3  | `DATABASE_URL` 以**属主 `arda`** 直连(`.env.example:82`)                                     | 运行态改走 **`arda_svc` 最小权限角色**(97_service_role.sql 已有,接线运行态)                                                                                                                                                                                                                                                 | `.env.example` ↔ `97_service_role.sql` 对账;运行态连库身份=arda_svc                |
| C4  | `workspace_id='__platform__'` 哨兵(`platform-seed.sql`、`schema.prisma`)标平台策展全局只读行 | **废哨兵**——改用**显式轴**:可空 `workspace_id`(NULL=平台全局)或独立 `scope` 列(`workspace`\|`platform`)。哨兵违反"workspace_id 平台签发"铁律(data_platform_100 §2.3.2#1,PR #89 / §6#22)                                                                                                                                     | 全仓 grep `__platform__` 零命中;DDL 有显式 scope 轴                                |

## D. 配置 / 环境 / 工具链

| #   | 现状(arda)                                                                                    | 要求(依据)                                                                                                                                        | 机检                                                        |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| D1  | `OIDC_SCOPES="openid profile email phone arda:subscription"`(`.env.example:58`+ compose 默认) | 清除**已退役** `arda:subscription`(D12,2026-07-14 平台已下线该 scope);留 `openid profile email phone`                                             | 全仓 grep `arda:subscription` 零命中(含活配置)              |
| D2  | 部署环境密钥名 `DEPLOY_REPO_DIR`(`deploy.yml`)                                                | 统一 **`DEPLOY_DIR`**(140 §6 键名权威,§6#1)                                                                                                       | `deploy.yml` grep `DEPLOY_DIR`;环境 secret 改名             |
| D3  | `PROVISION_WEBHOOK_SECRET=`(单值,`.env.example:108`;webhook route 单 secret 验签)             | 支持 **双 secret 轮换位**(`PROVISION_WEBHOOK_SECRET` + `_NEXT`,验签逐个试);**待平台侧 §6#19 轮换机制标准化后**接线,day-one 支持                   | webhook route 读双 secret;`.env.example` 有 `_NEXT` 位      |
| D4  | **npm workspaces**(`portals/package-lock.json`)                                               | 迁 **pnpm**(全栈一致,owner 2026-07-20;§8#6):`pnpm-workspace.yaml`+`pnpm-lock.yaml`,CI 缓存键/Dockerfile deps/osv `--lockfile=pnpm-lock.yaml` 随改 | `pnpm-lock.yaml` 在位、无 package-lock.json;`ci`/`audit` 绿 |

## E. 文档对齐(低优先)

| #   | 现状(arda)                                         | 要求(依据)                                                                                                                                                  | 机检                                              |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| E1  | docs 域文档 `arda-{sub}-NNN` 连字符命名(既往豁免)  | **新增文档一律** org 下划线族 `{kind}_{domain}_{NNN}_{slug}`;存量不强制重命名(收紧版 check-docs-numbering 对新文件生效)                                     | 新增 docs 过收紧版 `lint:docs-numbering --strict` |
| E2  | `arda_200` §4.1 措辞 "tenant.deprovisioned → 拆除" | 对齐 **"归档不硬删,保留复订"**(080-rp §4,§6#21)。**代码已合规**(`provisioning/lib/handler.ts:92-100` = status=deprovisioned + wipedAt 软删),仅 doc 措辞待改 | `arda_200` §4.1 文本 = 归档不硬删                 |

## F. 已核准合规(无需改,列明免重复动作)

- `.gitattributes` **已含 `*.md text eol=lf`** + 全类型 eol=lf——合规(反倒 vxture-platform 缺此规则,是**平台仓**待补,与 arda 无关)。
- `build.yml` **workflow_call + needs:call-build**——arda 即此正典的范本(§6#2),合规。
- OIDC allowed_scopes 除 `arda:subscription` 外的四值——D12 后无产品 scope,合规(product_200 §2.1 仍列 `{product_code}` scope 是**平台侧** doc 待修 §6#20,非 arda)。
- deprovision **代码软删**(wipedAt)——合规(仅 E2 doc 措辞待对齐)。
- 平台用量表 `commerce.*`→`metering.*` 改名——纯**平台侧**,arda 只调 C2/C3 端点、不引平台表,**N/A**。

## G. 交付与边界

- arda 任务线按 A→B→(C 授权后)→D→E 推进,每项一 PR + 机检验收(非绿=未达标)。**B 组两 bug 优先**(现管理面锁死)。
- C 组涉活库,须 owner 逐次授权走 `db-init.yml`(confirm=yes + expected_sha + production 审批门);reseed 前知会 operation。
- 新缺口(本清单/标准未覆盖)→ 先回 vxture-platform 补标准,再 arda 照做,**不在 arda 现造标准**。
- 平台线**只提供标准 + 参照实现 + 本要求**,arda 侧改动由 arda 线自负;完成以机检绿为准。
