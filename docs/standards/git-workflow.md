# Vxture Git Workflow Specification

> 版本：2.5.0 | 更新：2026-07-13

---

## 1. 分支体系

### 1.1 主干分支（长期存在，受保护，禁止直接 push）

| 分支      | 对应环境       | 说明                                                                                     |
| --------- | -------------- | ---------------------------------------------------------------------------------------- |
| `main`    | 平台生产       | 平台 prod；合并触发正式镜像构建，自动部署                                                |
| `beta`    | 平台预发布候选 | 合并触发 beta 镜像构建；当前没有长期平台 beta 服务器，未来可手动部署到临时 `vxture-beta` |
| `develop` | 开发集成       | 日常开发集成主线；仅触发 CI，不构建镜像，不部署                                          |

**平台层（VXTURE_DEPLOY_HOST）**：当前只有 prod，仅跟随 `main` 发布。`beta` / `develop` 分支不触发平台层部署。

**平台 beta（vxture-beta）**：未来如需平台 beta，使用临时按量服务器 `vxture-beta`，用完关闭；不得复用 vx-worker-02。

**业务层（vx-worker-02）**：属于外部业务仓库。业务 beta/prod 双环境、容器隔离、端口、子域名、部署脚本和发布确认不在本仓维护。

**CI 触发**：三个主干分支的 PR 以及 push 均触发 CI（type-check · lint · dep-cruiser）。

---

### 1.2 工作分支（短期，任务完成即删除）

| 前缀        | 用途             | 基分支    | 目标分支                      | 示例                               |
| ----------- | ---------------- | --------- | ----------------------------- | ---------------------------------- |
| `feature/`  | 新功能           | `develop` | `develop`                     | `feature/varda-tool-registry`      |
| `fix/`      | Bug 修复         | `develop` | `develop`                     | `fix/auth-cookie-domain`           |
| `hotfix/`   | 紧急生产修复     | `main`    | `main` + 同等修复回 `develop` | `hotfix/auth-jwt-leak`             |
| `refactor/` | 重构（不改行为） | `develop` | `develop`                     | `refactor/design-token-centralize` |
| `docs/`     | 纯文档变更       | `develop` | `develop`                     | `docs/architecture-restructure`    |
| `chore/`    | 构建 / CI / 依赖 | `develop` | `develop`                     | `chore/pnpm-upgrade`               |

**规则**：

- 所有工作分支必须从 `develop` 创建（`hotfix/` 例外，从 `main` 创建）
- 禁止直接推送到 `main` / `beta` / `develop`
- 分支名使用小写 kebab-case，描述具体内容
- 普通工作分支禁止直接 PR 到 `beta` 或 `main`

---

### 1.3 版本晋升流程

```
feature/* / fix/* / refactor/* / docs/* / chore/*
        │
        ▼  PR → squash merge
    develop   ←─── 日常集成，CI 验证
        │
        ▼  Promotion → fast-forward（集成测试通过后）
      beta    ←─── 平台候选版本，必要时部署到临时 vxture-beta 验证
        │
        ▼  Promotion → fast-forward（公测通过 / 发版窗口）
      main    ←─── 正式镜像构建 + 自动部署 prod
```

**核心目标**：当同一版本已完成晋升时，三大主干必须严格指向同一提交：

```
develop == beta == main
```

该规则用于避免阶段倒挂。禁止出现 `main` 比 `beta` 新、`beta` 比 `develop` 新的状态；版本一致时，三条主干不仅内容一致，commit tip 也必须一致。

**发布状态机**：

| 状态              | 分支关系                                    | 业务含义                         | 允许时长                 |
| ----------------- | ------------------------------------------- | -------------------------------- | ------------------------ |
| `all-equal`       | `develop == beta == main`                   | 当前版本已完成全链路发布         | 常态                     |
| `beta-validating` | `develop == beta`，`main` 为上一生产版本    | beta 正在公测、验收或观察        | 必须有发布确认记录       |
| `main-promoting`  | `beta -> main` promotion 已确认并执行中     | 生产发布门禁已通过，正在推进主干 | 短暂，仅限 workflow 执行 |
| `hotfix-active`   | `main` 有紧急修复，等待同等修复回 `develop` | 生产紧急修复例外                 | 必须尽快恢复标准链路     |

`develop == beta == main` 是发布完成态，不要求 beta 验证窗口内立即一致。`beta-validating` 不是倒挂；它表示 `develop` / `beta` 已包含候选版本，而 `main` 仍停留在上一生产版本。该状态必须具备对应的 `beta -> main` 晋升 PR、验收记录或发布待确认记录，禁止长期无记录悬挂。

真正禁止的倒挂状态：

- `main` 包含 `beta` 没有的提交。
- `beta` 包含 `develop` 没有的提交。
- 通过 `main -> beta`、`main -> develop`、`beta -> develop` 回灌恢复一致。

**hotfix 路径**：

```
main
 └──▶ hotfix/* ──▶ main  （紧急修复，受控例外）

develop
 └──▶ fix/* ──▶ develop ──▶ beta ──▶ main
      （补同等修复，继续走标准晋升链路）
```

`hotfix/*` 是生产紧急修复例外，不代表允许长期从 `main` 回灌。生产修复完成后，必须用同等修复（cherry-pick 或等价 patch）进入 `develop`，再按 `develop -> beta -> main` 重新恢复三主干一致。

**强制目标分支规则**：

| PR 目标分支 | 允许来源分支                                                | 说明                       |
| ----------- | ----------------------------------------------------------- | -------------------------- |
| `develop`   | `feature/*` / `fix/*` / `refactor/*` / `docs/*` / `chore/*` | 日常开发、修复、文档和维护 |
| `beta`      | `develop`                                                   | 预发晋升                   |
| `main`      | `beta` / `hotfix/*`                                         | 正式发布或紧急生产修复     |

除 `hotfix/*` 紧急生产修复外，任何工作分支都不得直接进入 `main`。

**强制合并 / 晋升方式**：

| PR 目标分支 | 允许合并方式           | GitHub 约束来源                                      |
| ----------- | ---------------------- | ---------------------------------------------------- |
| `develop`   | Squash merge           | `protect-develop` ruleset                            |
| `beta`      | Fast-forward promotion | `branch-promotion` workflow + `protect-beta` ruleset |
| `main`      | Fast-forward promotion | `branch-promotion` workflow + `protect-main` ruleset |
| 所有 PR     | 必须通过分支流检查     | Repository rulesets + `pr-checks`                    |

GitHub 默认合并按钮不直接等价于 Vxture 的晋升要求：

| 方式                  | 是否用于主干晋升 | 原因                                                                      |
| --------------------- | ---------------- | ------------------------------------------------------------------------- |
| Create a merge commit | 禁止             | 会在目标分支新增 promotion commit，导致 `beta > develop` 或 `main > beta` |
| Squash merge          | 禁止             | 会生成新的 squash commit，内容可一致但历史不一致                          |
| Rebase merge          | 禁止             | 会重写提交 SHA，不能保证 `develop == beta == main`                        |
| Fast-forward          | 必须             | 目标分支指针直接移动到源分支提交，满足三主干同指针                        |

因此，晋升 PR 只能作为评审、CI 和审计入口；实际晋升动作必须由受控 fast-forward promotion 流程完成，不通过 GitHub UI 的普通合并按钮完成。

### 1.4 Fast-forward Promotion 规范

Promotion 是受控分支指针推进，不是代码合并。目标是把下游主干移动到上游主干的同一个 commit。

| 晋升              | 前置条件                       | 目标结果          |
| ----------------- | ------------------------------ | ----------------- |
| `develop -> beta` | `beta` 必须是 `develop` 的祖先 | `beta == develop` |
| `beta -> main`    | `main` 必须是 `beta` 的祖先    | `main == beta`    |

`beta -> main` 是生产发布门禁，不是单纯技术同步。只有 beta 验证、公测或业务验收通过后，才能由授权人员触发 `branch-promotion` 将 `main` fast-forward 到 `beta`。`main` 一旦更新，即表示该版本已获准进入生产发布链路；生产确认不得后移到 `main` 更新之后。

推荐实现方式：

1. 创建晋升 PR，用于记录本次晋升范围、变更摘要、CI 结果和审批意见。
2. PR 通过 required checks 后，不点击普通 merge 按钮。
3. 由 `branch-promotion` workflow 执行 ref fast-forward。
4. 推进完成后，workflow 在晋升 PR 写入源 commit、目标 commit、操作者和时间。
5. 验证 `develop == beta == main` 或当前晋升链路目标相等。

人工不得在本地执行 `git push origin develop:beta`、`git push origin beta:main`、PATCH Git ref 或临时关闭 ruleset 完成日常晋升。若 `branch-promotion` workflow 被权限、ruleset 或 required checks 阻断，发布必须暂停，先修复 workflow / ruleset 闭环，再重新触发 workflow；不得把人工绕行当作兜底路径。

`branch-promotion` 必须使用专用 promotion actor 执行受保护分支推送。P4 试跑已验证：`GITHUB_TOKEN` / `github-actions[bot]` 对 `workflow_dispatch` 触发的 direct push 不能作为稳定 ruleset bypass 设计。因此晋升凭据必须来自仓库 secret `PROMOTION_TOKEN`，并且 `protect-beta` / `protect-main` 的 bypass actor 必须指向同一个专用 actor。

执行身份选择：

1. P4 首次落地允许使用 owner-controlled `stonesmoker` 作为 promotion actor，仓库 secret 命名为 `PROMOTION_TOKEN`。
2. 后续多人协作或发布职责分离后，再迁移到专用 machine user 或 GitHub App installation token；若采用 GitHub App，必须同步新增运行时 token 生成步骤。
3. 禁止临时关闭 ruleset、PATCH Git ref 或本地直接 push 作为日常晋升路径。

`branch-promotion` workflow 输入：

| 输入                | 说明                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `target`            | 晋升目标，只允许 `beta` 或 `main`                                  |
| `pr_number`         | 对应晋升 PR 编号，用于校验和写入审计评论                           |
| `expected_sha`      | 预期源分支 commit SHA，防止触发期间漂移                            |
| `release_confirmed` | 仅 `target=main` 强制为 `true`，表示 beta 验证、公测或验收已经通过 |
| `release_note`      | 仅 `target=main` 强制填写，记录生产发布确认依据                    |

workflow 强制校验：

1. `target=beta` 时 PR 必须是 `develop -> beta`；`target=main` 时 PR 必须是 `beta -> main`。
2. 晋升 PR 必须保持 `OPEN`，晋升动作完成后由 GitHub 自动识别为 merged。
3. PR head SHA 必须等于 `expected_sha` 和当前源分支 SHA。
4. 目标分支必须是源分支祖先；否则拒绝晋升。
5. 目标分支 required checks 必须成功。
6. `target=main` 时必须提交 `release_confirmed=true` 和非空 `release_note`，作为 beta 验证通过记录或发布确认说明。
7. 推送必须通过 `PROMOTION_TOKEN` 执行普通 fast-forward push，禁止 force push。

标准触发方式：

```bash
gh workflow run branch-promotion.yml \
  --repo vxture/vxture \
  -f target=main \
  -f pr_number=<beta-to-main-pr> \
  -f expected_sha=<origin-beta-sha> \
  -f release_confirmed=true \
  -f release_note="<beta validation and production release note>"
```

`branch-promotion` workflow 首次落地到 `main` 前，才允许执行一次受控 bootstrap 晋升；bootstrap 必须按紧急对齐同等级别记录原因、操作者、源 commit、目标 commit，并在 workflow 上线后立即停止手工临时关闭 ruleset 的日常晋升方式。若 `branch-promotion.yml` 已在默认分支可触发，则不得再声明 bootstrap 例外。

`protect-beta` 和 `protect-main` 的 bypass actor 仅允许当前 `PROMOTION_TOKEN` 所属账号，用于该 workflow 的普通 fast-forward push。P4 当前阶段该账号为 `stonesmoker`；后续若迁移到 machine user 或 GitHub App，必须同步切换 bypass actor。两条 ruleset 同时启用 required linear history，并将 `allowed_merge_methods` 收敛为 `["squash"]`（2026-06-28 由 `["merge"]` 调整），用于阻断 GitHub UI merge commit 晋升路径——`["merge"]` 与 required linear history 自相矛盾，且在 bypass actor 误点合并按钮时会注入 merge commit 直接造成主干分叉。若 workflow push 被 ruleset 拒绝，应修复 bypass actor、workflow token 或 required checks 配置，而不是临时 disable ruleset。

若 `--ff-only` 失败，说明目标分支已经分叉，禁止继续普通合并。必须先分析分叉原因，必要时走“紧急对齐流程”。

### 1.5 Required Checks 契约

Required status check 名称是 ruleset 与 workflow 的接口契约，不是展示文案。禁止随意修改 job name；如确需修改，必须先更新本规范并完成变更评审。

Vxture 使用稳定聚合门禁名称：

| Check 名称            | 职责                                                     |
| --------------------- | -------------------------------------------------------- |
| `quality-gate`        | 类型检查、Lint、设计系统护栏、包边界检查的聚合质量门     |
| `enforce-branch-flow` | PR 来源/目标合法性检查，阻止错误流向、回灌、倒挂风险入口 |
| `build`               | 构建关键服务，验证产物可生成                             |
| `test-coverage`       | 单元测试与覆盖率产物                                     |
| `audit`               | 关键依赖安全审计                                         |

`quality-gate` 对代码与基础设施变更固定包含：

1. Type Check：`pnpm type-check:all`
2. Lint：`pnpm --recursive --if-present lint`
3. Guardrail：`pnpm lint:design`
4. Boundaries：`pnpm lint:boundaries`

P6a 起，纯文档变更允许 `quality-gate` 走轻量路径：required check 仍稳定创建并成功结束，但跳过上述重型步骤。此例外只适用于 `docs/**`、Markdown / MDX 或根 `AGENTS.md` 类说明文件；任何代码、workflow、依赖或部署文件变更都必须运行完整质量门禁。

推荐 required checks 矩阵：

| 目标分支  | Required checks                                                          |
| --------- | ------------------------------------------------------------------------ |
| `develop` | `quality-gate`、`enforce-branch-flow`                                    |
| `beta`    | `quality-gate`、`build`、`test-coverage`、`enforce-branch-flow`          |
| `main`    | `quality-gate`、`build`、`test-coverage`、`audit`、`enforce-branch-flow` |

`SonarQube` 暂不作为 required check。待扫描稳定性、外部状态名称和失败处理策略明确后，再单独纳入 ruleset。

---

### 1.6 待执行的独立整改分支（DS 审计后续）

以下分支均从 `develop` 创建，完成后 PR 回 `develop`：

| 分支                               | 内容                                                                 | 优先级 |
| ---------------------------------- | -------------------------------------------------------------------- | ------ |
| `fix/ds-context-split`             | density / theme context 拆分；DensityProvider 反模式重构             | P2     |
| `feature/ds-button-danger-variant` | DS Button 增加正式 `variant="danger"` 扩展点，清理 admin CSS 补丁    | P2     |
| `fix/ds-layout-tokens`             | 布局组件 gap / padding 间距 token 设计对齐；FullscreenContainer 重构 | P2     |
| `refactor/portal-rsc-pages`        | website 落地页 / admin 首页改为 Server Component                     | P2     |
| `refactor/portal-shared-ui`        | ActionButton / EmptyState 提取到共享包                               | P3     |
| `fix/admin-token-dark-mode`        | admin `--tenant-*` scale token 语义化；补充 gray-950 CSS 变量        | P3     |

---

## 2. Commit 规范

日常开发使用 **Conventional Commits** 格式：

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

`scope` 使用包短名（不带 `@vxture/` 前缀）或目录名：

```
feat(varda-bff): add CallerContext middleware
fix(core-auth): handle expired refresh token edge case
refactor(design): centralize tenant settings styles
perf(ds): wrap hook callbacks with useCallback for stability
docs(architecture): remove duplicate dependency rules
chore(deps): upgrade pnpm to 10.x
```

**规则**：

- description 使用中文或英文均可，但保持全 PR 一致
- 禁止无意义的 commit 描述（如 `update`、`fix bug`、`wip`）

---

## 3. PR 流程

1. 从目标基分支（通常是 `develop`）创建工作分支
2. 开发完成后发起 PR，目标分支按 §1.3 晋升流程确定
3. PR 标题遵循 Conventional Commits 格式
4. PR 描述说明：变更内容、测试方式、相关 issue / 设计文档
5. 合并方式按 PR 类型选择：
   - 工作 PR：`feature/*` / `fix/*` / `docs/*` / `chore/*` / `refactor/*` → **Squash merge**
   - 晋升 PR：`develop -> beta`、`beta -> main` → **`branch-promotion` workflow 执行 Fast-forward promotion**
   - 紧急修复 PR：`hotfix/* -> main` → **受控例外，完成后补同等修复回 develop**
6. 合并后删除工作分支

**禁止事项**：

- 禁止对晋升 PR 使用 GitHub 普通 merge / squash / rebase 按钮；否则内容可能同步，但 Git 历史不会满足三主干同指针。
- 禁止用本地强推、reset、直接 push 或手工临时关闭 ruleset 对齐 `main` / `beta` / `develop`。
- 禁止用 `sync/*`、`main -> beta`、`main -> develop` 或 `beta -> develop` 直接回灌；需要补同等修复时，从 `develop` 创建 `fix/*` 后继续走标准晋升链路。
- 若 UI 显示的合并按钮与目标分支约定不一致，先检查 Repository Rulesets，不要继续合并。

### 3.1 紧急对齐流程

当历史倒挂已经发生，且无法通过 fast-forward 恢复时，允许在获得明确确认后执行一次性紧急对齐。

执行要求：

1. 记录 `develop`、`beta`、`main` 当前 commit。
2. 创建并推送远端备份分支。
3. 临时调整 ruleset，仅开放必要窗口。
4. 使用 `--force-with-lease` 对齐目标分支，禁止无 lease 强推。
5. 立即恢复 ruleset。
6. 验证三主干指向一致。
7. 在变更记录中写明原因、操作者、旧 commit、新 commit、恢复路径。

紧急对齐不是日常晋升方式；每次发生都必须反查流程缺陷并修正文档 / ruleset / workflow。

### 3.2 紧急对齐变更记录

| 日期       | 操作者        | 原因                                                                                                                                                                                                                                                                                                               | 旧 commit                       | 新 commit                                   | 恢复路径 / 后续修正                                                                                                                                                                                                                                                                                                                               |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-28 | `stonesmoker` | `develop -> beta` / `beta -> main` 晋升被误用 GitHub 普通 merge 按钮执行（PR #479/#482/#485 落到 beta、#480/#483/#486 落到 main），注入 merge commit，使 `beta` 不再是 `develop` 祖先、`main` 不再是 `beta` 祖先，`branch-promotion` fast-forward 被阻断。三分支内容一致（均为 #484），merge commit 为纯历史噪声。 | `beta=bde871e0` `main=98f23f74` | `beta=0d18dd86`(#488) `main=4b063b29`(#484) | 用 bypass actor force-reset `beta -> develop`、`main -> #484`，恢复 `main ⊂ beta ⊂ develop` 线性；并把 `protect-beta` / `protect-main` 的 `allowed_merge_methods` 由 `["merge"]` 收敛为 `["squash"]`，移除与 required linear history 矛盾的 merge-commit 入口。流程缺陷=晋升误走合并按钮，已在 §1.3 / §3 重申只能走 `branch-promotion` workflow。 |

> 说明：本次对齐使用 standing bypass actor 直接 force push（非 §3.1 的临时 ruleset 窗口 + `--force-with-lease`），旧 commit 已在上表登记以备回滚。后续紧急对齐应严格按 §3.1 执行。

### 3.3 Hotfix Back-flow 操作步骤（TD-023）

`hotfix/*` 直接从 `main` 开出，合并后 `main` 领先 `develop` 一个未回灌的提交；若不处理，下次
`develop -> beta -> main` 晋升的 fast-forward 前置条件（`main` 必须是 `beta` 祖先）会被破坏——
`main` 携带一个 `develop`/`beta` 都没有的提交，晋升被阻断，暴露分叉。

合并 hotfix PR 后立即执行：

1. 记录 hotfix 合并后的 `main` commit：`git log -1 --format=%H origin/main`。
2. 从 `develop` 创建 `fix/<same-topic>` 分支。
3. `git cherry-pick <hotfix-commit-sha>` 把同一改动引入该分支；冲突时手工解决，保持修复语义一致，不强求文件级完全相同（develop 可能已在别处继续演进）。
4. 按 §3 标准 PR 流程发起 `fix/* -> develop`，正常走 `quality-gate` 等 required checks（不得因为"已经在 main 验证过"而跳过）。
5. 合并后修复即进入 `develop` 主线，随下一次常规 `develop -> beta -> main` 晋升自然重新出现在 `main`（内容与 hotfix 提交等价，`fast-forward` 校验不受影响）。
6. 若 hotfix 触及的文件在 `develop` 上已发生结构性变化导致 cherry-pick 冲突过大，改为在 `fix/*` 分支上手工重新实现同等修复，PR 描述注明"对应 hotfix PR #\<N\> 的回灌"。

不允许用 `main -> develop` 或 `sync/*` 直接回灌（§3 禁止事项已列）——回灌必须是一个真实的、走完整 CI 的 `fix/*` PR，而不是绕过质量门禁的分支指针搬运。

---

## 4. Release Tag 规范

正式发布时在 `main` 对应提交上打 Tag：

### Tag 格式

```
shortname@Vx.y.yyMMdd.nn
```

| 字段        | 说明                                 |
| ----------- | ------------------------------------ |
| `shortname` | 包短名（不带 `@vxture/` 前缀）       |
| `Vx.y`      | semver 版本号（来自 `package.json`） |
| `yyMMdd`    | 发布日期（年月日）                   |
| `nn`        | 当日序号（`01`、`02`...）            |

**示例**：`core-tenant@V1.0.0.260314.01`

### 发布流程

1. 确认代码已合并到 `main` 且 CI 全绿
2. 更新 `package.json` 版本号
3. 提交版本号变更（commit message：`chore(shortname): release Vx.y`）
4. 打 Tag 并推送：`git tag shortname@Vx.y.yyMMdd.nn && git push origin --tags`

---

## 5. 版本号规则（SemVer）

| 类型          | 规则                       |
| ------------- | -------------------------- |
| Patch `x.y.Z` | Bug 修复、向后兼容的小改动 |
| Minor `x.Y.0` | 新增功能、向后兼容         |
| Major `X.0.0` | 破坏性变更（接口不兼容）   |

**monorepo 包独立版本**：每个包独立维护版本号，不做全仓库统一版本。
