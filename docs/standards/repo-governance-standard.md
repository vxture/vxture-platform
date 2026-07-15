# Vxture 产品仓库治理规范（org 级整顿依据）

> **适用**：org 下全部产品仓库（vxture-platform、umbra、arda、vx-Agent-\* 等）。
> **用途**：各仓按本文整顿对齐到统一的**主干模式 + tag→环境 CD + 敏感信息治理**。
> **状态**：vxture-platform 已按本规范落地（2026-07-15），是参照实现。
> **配套**：迁移操作步骤见 [`../rebuild/README.md`](../rebuild/README.md)；密钥/边界细节见
> [`security.md`](security.md)；CI 提效见 [`cicd-optimization-playbook.md`](cicd-optimization-playbook.md)；
> 容器健康见 [`container-healthcheck-standard.md`](container-healthcheck-standard.md)。

本文只定"每个仓必须对齐什么"，末尾附**整顿检查清单**。

---

## 1. 分支与发布：主干模式（trunk-based）

**唯一长期分支 = `main`。**

- 短生命特性分支 → PR → **squash 合并 → 删分支**。禁止直接 push `main`。
- CI 跑在 **PR 与 push `main`** 上（不再有 develop/beta 分支 CI）。
- **弃用整套 gitflow**：`develop`/`beta`/`main` 三分支晋升、`branch-promotion.yml`、
  `deploy-production.yml`、`PROMOTION_TOKEN`/`PROMOTION_ACTOR`、Fast-forward Promotion。
- **分支保护 ruleset**（`rebuild/main-ruleset.json` 同款套用）：required status checks（按 job 名匹配）、
  push 前需 PR、禁 force-push、线性历史；单人仓 `required_approving_review_count=0`（靠 checks 把关），
  多人仓改 `1`；`bypass_actors` 留仓库 admin 应急。
- **落地时机（关键顺序）**：空仓先 `git init`→`main`→首推建立 `main`→跑一次 CI 让 required checks
  至少产生一次→**此时**再 apply ruleset（先加限制性 ruleset 会挡住首次代码导入）。

---

## 2. 敏感信息检查逻辑（secret hygiene）

**铁律：凭证永不入库，只经环境/配置注入。** 泄露即在**源头控制台 revoke**，不靠改历史。

**四层检测，缺一不可：**

1. **GitHub secret scanning + push protection**（仓库 Settings 开启）——推送即拦。
2. **gitleaks CI**（`.github/workflows/secret-scan.yml`）——全量 + PR 增量扫描，命中即 fail 阻断合并；
   直接跑 pinned gitleaks 二进制（org 仓免 license），规则见仓库根 **`.gitleaks.toml`**。
3. **本地 husky pre-commit**（`.husky/pre-commit`）——提交前本地 gitleaks，早拦。
4. **仓库私有**（可见性由 owner 定；公开期视同泄露风险，敏感内容按公开处理）。

**重建/迁移专用**：干净树导入前先 gitleaks **全史扫描**，命中即停 → 源头 revoke 泄露凭证 →
干净重导（orphan/丢历史包袱），不把历史里的密钥带进新仓。

**代码里的开源/协议残留**（LICENSE/MIT 标记等）：私有仓一律清除。

---

## 3. Secret vs Variable 分类原则

|              | 定义                                    | 例                                                            |
| ------------ | --------------------------------------- | ------------------------------------------------------------- |
| **secret**   | 泄露即危害的**凭证**                    | password / token / 私钥 / passphrase / oauth secret           |
| **variable** | **公开标识/配置**（日志可读、便于排障） | hostname / registry URL / namespace / 公开 site key / ACL tag |

- **不要过度 mask 公开标识**（把 registry host 当 secret 只会妨碍排障，无安全收益）。
- **层级**：
  - **org 级**：跨仓共享的凭证与 host（ACR user/password/registry/internal-host、tailscale oauth、npm token）。
  - **repo 级**：仓库专属公开标识（镜像 `NAMESPACE`、前端公开 `*_SITE_KEY`）。
  - **environment 级**：部署目标 + 审批门（`DEPLOY_HOST_*`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`/`_PASSPHRASE`）。
- 命名 `SCREAMING_SNAKE_CASE`；**定期审计死值/重复**（0 引用的旧凭证及时删，减攻击面）。
- host/username/client-id 等"保守地当 secret"可接受（defense-in-depth），但非必须。

---

## 4. 部署：tag → 环境 CD

**部署只由 tag 触发**，前缀决定环境：

| tag               | 环境              | 门控                        |
| ----------------- | ----------------- | --------------------------- |
| `dev-YYYYMMDD.N`  | develop           | 仅 dev-\*                   |
| `beta-YYYYMMDD.N` | beta              | 仅 beta-\*                  |
| `vX.Y.Z`          | production        | 仅 v\*.\*.\* + **必审人门** |
| `varda-\*`        | varda（自有节奏） | —                           |

`docker-build.yml`（tag）build+push 镜像 → `deploy.yml`（tag）拉取部署。**踩过的坑（必须规避）：**

- **镜像 tag 一致**：deploy 用 `github.ref_name`（如 `v0.1.0`）拉取；docker-build 的 metadata **必须带
  `type=raw,value=${{ github.ref_name }}`**——semver 模式会把 `v0.1.0` 剥成 `0.1.0`，且
  `dev-*`/`beta-*`/`varda-*` 非 semver 只产出 `sha-`，没有 raw tag 会 **image not found**。
- **deploy 等 docker-build**：二者由同 tag **并行触发无先后**；deploy 过审批门后**轮询等本 tag 的
  docker-build 成功再拉**（需 `actions: read`），否则拉空。
- **registry 与部署主机同区域**：云 ACR 的 **VPC 内网端点按区域隔离**，跨区不可达。ACR 必须建在与部署
  ECS **同 region**（否则内网 login 超时，只能走公网、慢且付费）。
- **内存受限主机（如 2C2G）逐服务替换**：整栈一次性 `compose pull + up -d`（尤其容器改名→全量重建）会
  打爆内存、拖垮 tailnet。改为**逐服务 pull + `up -d --no-deps`**（停旧起新内存 1:1）。
- **生产写走人工审批门**：生产部署/DB 写由 owner 在 GitHub 环境 **Review deployments 点击批准**，
  不靠 agent/口头授权自审。

---

## 5. 镜像仓库 profile（双仓按地理）

- **domestic（ACR 内网 + tailnet）**：境内部署机（platform→worker-01、varda→worker-02）。CI runner
  入 tailnet 走内网到主机 + ACR 同区内网拉镜像。
- **overseas（GHCR + 公网）**：海外部署机（umbra→worker-04，**不在 tailnet**）。去掉 tailscale join、
  镜像换 GHCR、直连公网 SSH。ACR 内网端点对海外主机不适用。

---

## 6. 环境与生产 DB 运维

- 三环境 `develop`/`beta`/`production`，tag 部署策略 + production 必审人。若要 `dev-*`/`beta-*` tag 也
  能部署，**三环境都要配 `DEPLOY_*`**；否则明确"只做生产 tag 部署"（dev/beta 空 → 那些 tag 会失败）。
- **生产 DB 运维走 `db-init.yml`**（workflow_dispatch）：`confirm=yes` + `expected_sha` 钉版本
  （防浮动 ref 跑到旧 seed）+ `environment: production` 审批门 + tailnet + `DEPLOY_HOST_TAILNET`。
  常规部署链**不跑 migration/seed**，DB 结构/数据变更是独立授权动作。

---

## 7. 数据层（若仓库自带独立 DB）

- **DDL 单一权威** = 手写 `deploy/database/ddl/*.sql`（`apply.sh` clean-baseline，非 prisma migrate）。
- **值域权威** = `@vxture/shared`；guardrail 校 DDL CHECK == @shared（新增可写列/值须同步）。
- **最小权限服务角色** + **列锁**（`98_column_locks`：REVOKE 整表 UPDATE + GRANT 可写列白名单，锚点列
  id/单号锁死）；**新增可写列必须同步白名单**，否则服务写会 permission denied。
- **活库增量**：`ddl/apply` 是 create-once（不 ALTER 已存在表），增量列用幂等
  `ADD COLUMN IF NOT EXISTS` 内嵌 seed，让 db-init `seed` 在活库自足；`docker exec` 改库须带 `-i`。

---

## 8. 护栏（guardrails，CI 强制）

按仓库形态启用：design-system、data-architecture（DDL 铁律）、catalog-domains（DDL==@shared）、
seed 幂等、package boundaries、container-healthcheck（Next standalone 须 `0.0.0.0`）、secret-scan、
env-audit（部署包/运行态模板契约）。护栏是**仓库级**，本地 `pnpm lint` 不一定覆盖——新增 CSS/DDL/seed
必跑对应 guardrail。

---

## 9. 整顿检查清单

- [ ] `main` 唯一长期分支；gitflow 三分支 / 晋升 / `PROMOTION_*` / `deploy-production.yml` 已清。
- [ ] `main-ruleset` 已 apply（required checks + push 前 PR + 禁 force-push + 线性历史）。
- [ ] `docker-build`/`deploy` = tag→env；raw tag、wait-for-build、registry 同区、逐服务 recreate 全到位。
- [ ] 敏感信息四层检测（push protection + gitleaks CI + pre-commit + `.gitleaks.toml`）就位；仓私有；无开源残留。
- [ ] secret/variable **分类正确**、**层级正确**（org/repo/env）、无死值/重复。
- [ ] 三环境 + production 审批门配置；生产 DB 走 `db-init` + expected_sha + 审批。
- [ ] （有 DB）DDL 单一权威 + @shared 值域 + 最小权限/列锁 + 活库增量幂等 + 护栏。
- [ ] 部署 profile 选对（domestic ACR+tailnet / overseas GHCR+公网）。
