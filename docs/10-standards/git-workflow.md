# Vxture Git Workflow Specification（主干模式）

> 版本：3.0.0 | 更新：2026-07-15
> **主干模式（trunk-based）取代原 gitflow 三分支晋升**（2026-07-15）。CD/密钥/部署细节见
> [`repo-governance-standard.md`](./repo-governance-standard.md)，本文只定 git 工作流（分支 · 提交 · PR · tag）。

---

## 1. 分支体系

### 1.1 主干分支

**唯一长期分支 = `main`**（受保护，禁止直接 push）。

| 分支   | 说明                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------- |
| `main` | 唯一长期分支；短生命特性分支经 PR squash 合入。**部署不由合并 `main` 触发，只由 tag 触发**（见 §4）。 |

- CI 跑在 **PR 与 push `main`** 上。不再有 `develop`/`beta` 长期分支、不再有分支晋升。
- 弃用整套 gitflow：`develop`/`beta` 分支、`branch-promotion.yml`、`deploy-production.yml`、
  `PROMOTION_TOKEN`/`PROMOTION_ACTOR`、fast-forward promotion、三主干同指针、hotfix back-flow。

---

### 1.2 工作分支（短期，任务完成即删除）

| 前缀        | 用途             | 基分支 | 目标   | 示例                               |
| ----------- | ---------------- | ------ | ------ | ---------------------------------- |
| `feat/`     | 新功能           | `main` | `main` | `feat/plan-version-lifecycle`      |
| `fix/`      | Bug / 生产修复   | `main` | `main` | `fix/deploy-acr-registry-fallback` |
| `refactor/` | 重构（不改行为） | `main` | `main` | `refactor/design-token-centralize` |
| `docs/`     | 纯文档变更       | `main` | `main` | `docs/repo-governance-standard`    |
| `chore/`    | 构建 / CI / 依赖 | `main` | `main` | `chore/pnpm-upgrade`               |

**规则**：

- 所有工作分支从 `main` 创建，PR → **squash 合并 → 删分支**。
- 禁止直接 push `main`；分支名小写 kebab-case，描述具体内容。
- **生产紧急修复 = 普通 `fix/` PR 合入 `main` + 打生产 tag**（`vX.Y.Z`）。主干无 gitflow 的 `hotfix/`
  回灌流程——修复进 `main` 即是唯一真相，无需回流其它分支。

---

### 1.3 Required Checks 契约

Required status check 名称是 ruleset 与 workflow 的**接口契约**，不是展示文案。禁止随意改 job name；
确需修改先更新本规范 + `main-ruleset.json` 并评审。

| Check           | 职责                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------- |
| `quality-gate`  | 类型检查 · Lint · 设计系统护栏 · 包边界 · 数据架构护栏聚合                                |
| `build`         | 构建关键服务 + boot-smoke（DI 图在 esbuild bundle 下解析）                                |
| `test-coverage` | 单元测试与覆盖率                                                                          |
| `audit`         | 依赖安全审计（osv-scanner 扫 pnpm-lock，**阻断门**；残留经 `.osv-scanner.toml` 记名接受） |
| `gitleaks`      | 密钥扫描（见 §governance 敏感信息检查）                                                   |
| `Format`        | prettier 格式检查                                                                         |

- **不再有 `enforce-branch-flow`**（主干无分支流/晋升方向可校验）。
- `quality-gate` 对代码/基础设施变更固定含 type-check / lint / `lint:design` / `lint:boundaries` /
  `lint:data-design` 等；**纯文档变更**（`docs/**`、Markdown）走轻量路径：check 仍稳定产生并成功，
  跳过重型步骤。任何代码/workflow/依赖/部署文件变更必须跑完整门禁。
- `main` 的 required checks（`main-ruleset.json`）：`quality-gate`、`build`、`test-coverage`、
  `audit`、`gitleaks`。`SonarQube` 非阻断（docs-only 时 skipping）。

---

## 2. Commit 规范

**Conventional Commits**：

```
<type>(<scope>): <description>
```

| type       | 含义                   |
| ---------- | ---------------------- |
| `feat`     | 新功能                 |
| `fix`      | Bug 修复               |
| `refactor` | 重构（不影响外部行为） |
| `perf`     | 性能优化               |
| `docs`     | 纯文档变更             |
| `chore`    | 构建、CI、依赖升级等   |
| `test`     | 测试相关               |
| `style`    | 代码格式（不影响逻辑） |
| `ci`       | CI/CD workflow 变更    |

`scope` 用包短名（不带 `@vxture/` 前缀）或目录名：

```
feat(admin): plan version publish capability
fix(deploy): fall back to public ACR endpoint when internal is unreachable
docs(standards): org-wide repo governance standard
chore(deps): upgrade pnpm to 10.x
```

**规则**：

- description 中英文均可，全 PR 一致；禁止无意义描述（`update`、`fix bug`、`wip`）。
- commit message 英文；注释 2026-06-08 起英文。
- 提交/推送/合并/发布**每步单独确认**，不绕护栏。

---

## 3. PR 流程

1. 从 `main` 创建工作分支。
2. 开发完成发起 PR（目标 `main`），标题遵循 Conventional Commits。
3. PR 描述说明：变更内容、测试方式、相关 issue / 设计文档。
4. required checks 全绿后 **Squash merge**（保持线性历史）。
5. **合并后删除工作分支**（本地 + 远端）。

**禁止事项**：

- 禁止直接 push `main`；禁止 force push `main`；禁止绕过 required checks。
- 禁止 merge commit / rebase merge（`allowed_merge_methods` 收敛为 `["squash"]` + required linear history）。
- 删分支前用 PR 状态 / patch-id 严格核实其改动已在 `main`（squash 合并后原分支非祖先，`git branch --merged`
  不显示，用 PR 已合状态或内容比对确认）。

> 主干模式无 gitflow 的"版本晋升 / 三主干同指针 / 紧急对齐 / hotfix 回灌"——这些随 gitflow 一并移除。

---

## 4. 发布与 Tag

### 4.1 部署 tag（触发 CD）

**部署只由 tag 触发**，前缀决定环境（详见 [`repo-governance-standard.md`](./repo-governance-standard.md) §4）：

| tag               | 环境       | 门控                       |
| ----------------- | ---------- | -------------------------- |
| `dev-YYYYMMDD.N`  | develop    | 仅 `dev-*`                 |
| `beta-YYYYMMDD.N` | beta       | 仅 `beta-*`                |
| `vX.Y.Z`          | production | 仅 `v*.*.*` + **必审人门** |
| `varda-*`         | varda      | 自有发布节奏               |

- 打 tag → `docker-build`（build+push 镜像，带 raw ref tag）→ `deploy`（tag→env，过审批门 →
  等 docker-build 完成 → 部署）。生产写由 owner 在 GitHub **点击审批**。
- 首个生产发布 = `v0.1.0`（vxture-platform，2026-07-15）。

### 4.2 包发布 tag（@vxture/\* 包发布）

发布可复用的 @vxture/\* 包（如 design-system）时，在 `main` 对应提交打包 tag：

```
shortname@Vx.y.yyMMdd.nn
```

| 字段        | 说明                                 |
| ----------- | ------------------------------------ |
| `shortname` | 包短名（不带 `@vxture/` 前缀）       |
| `Vx.y`      | semver 版本号（来自 `package.json`） |
| `yyMMdd`    | 发布日期                             |
| `nn`        | 当日序号                             |

示例：`shared@V1.1.0.260715.01`。包发布流程：确认合入 `main` + CI 全绿 → 更 `package.json` 版本 →
`chore(shortname): release Vx.y` → 打 tag 推送。

---

## 5. 版本号规则（SemVer）

| 类型          | 规则                     |
| ------------- | ------------------------ |
| Patch `x.y.Z` | Bug 修复、向后兼容小改动 |
| Minor `x.Y.0` | 新增功能、向后兼容       |
| Major `X.0.0` | 破坏性变更（接口不兼容） |

**monorepo 包独立版本**：每个可发布包独立维护版本号，不做全仓统一版本；平台部署用 `vX.Y.Z` 发布 tag。
