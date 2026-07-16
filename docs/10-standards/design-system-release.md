# Design System 版本发布规范

版本：1.0.0
日期：2026-05-30
范围：`@vxture/design-system`、`@vxture/shared`、现有 `publish-design-system.yml` workflow、后续 `publish-*` 包发布规划

本文定义 DS 包的版本判断、发布准备、dry run、真实发布和发布后验证流程。DS 包发布必须走 PR、CI、merge、workflow 验证流程，禁止从本地直接 `pnpm publish` 到 GitHub Packages。当前实现文件为 `.github/workflows/publish-design-system.yml`；该流程是 `publish-*` 包发布规划下的 Design System 专用入口。

## 1. 包职责与版本边界

| 包                      | 职责                                         | 上层应用感知方式                   |
| ----------------------- | -------------------------------------------- | ---------------------------------- |
| `@vxture/design-system` | UI 组件、Icon、Provider、token、品牌样式入口 | 应用侧主依赖                       |
| `@vxture/shared`        | 跨层类型、常量、纯工具                       | 默认作为 DS 传递依赖，按需显式依赖 |

消费应用优先显式依赖 `@vxture/design-system`。只有业务代码直接导入 shared 的类型、常量或工具时，才显式声明 `@vxture/shared`。

## 2. 版本号规则

两个包独立维护 SemVer。是否同时发版由实际变更决定，不做全仓库统一版本。

| 变更类型                           | `@vxture/design-system` | `@vxture/shared` | 说明                                  |
| ---------------------------------- | ----------------------- | ---------------- | ------------------------------------- |
| 修复 DS 组件、样式、token bug      | Patch                   | 不变             | 不改变公开 API                        |
| 新增 DS 组件、样式入口、品牌 token | Minor                   | 不变             | 向后兼容新增能力                      |
| 删除或改名 DS 公开入口             | Major                   | 视情况           | 破坏消费端 import 或行为              |
| 修改 shared 类型、常量、工具       | 不变或 Patch            | Patch / Minor    | DS 未依赖新 shared 能力时 DS 可不发版 |
| DS 依赖新增 shared 公开能力        | Patch / Minor           | Patch / Minor    | shared 先发布，DS 随后发布            |
| 仅文档、CI、发布流程变更           | 不发版                  | 不发版           | 不产生 package 版本                   |

品牌 token 当前允许 `vxture` 与 `ruyin` 同构，但版本判断按公开能力处理：新增品牌入口为 minor，修正品牌样式 bug 为 patch，删除或改名品牌入口为 major。

## 3. 发布准备

发布准备必须从最新 `main` 创建短期分支，提交后通过 PR 合并回 `main`。

1. 确认变更已合并到 `main`，且 `main` CI 通过。
2. 根据第 2 节判断需要 bump 的包。
3. 修改对应 `package.json` 的 `version`。
4. 如 lockfile 发生变化，一并提交 `pnpm-lock.yaml`。
5. 本地至少运行：

```bash
pnpm lint:design
pnpm --filter @vxture/shared build
pnpm --filter @vxture/design-system type-check
pnpm --filter @vxture/design-system lint
pnpm --filter @vxture/design-system build
```

6. 创建 PR，等待 `Type Check · Lint · Boundaries` 等 required checks 通过。
7. 通过 squash merge 合并到 `main`。

提交信息建议：

```text
chore(ds): release design-system 1.3.1
chore(shared): release shared 1.2.3
chore(ds): release design-system 1.3.1 and shared 1.2.3
```

## 4. Dry Run

真实发布前必须先运行 dry run。

1. 进入 GitHub Actions。
2. 选择现有 `publish-design-system` workflow。
3. `Run workflow` 选择 `main`。
4. `dry_run` 默认就是 `true`，保持默认值。
5. 等待 workflow 成功。

dry run 会执行：

- 安装依赖
- build `@vxture/shared`
- type-check / lint / guardrail 检查 `@vxture/design-system`
- build `@vxture/design-system`
- `pnpm pack --dry-run`
- 查询 GitHub Packages 中是否已存在相同版本

dry run 失败时禁止真实发布，必须新建修复分支，通过 PR 合并后重新 dry run。

## 5. 真实发布

真实发布只能在 dry run 成功后执行。当前 workflow 支持两种入口：

| 入口     | 触发方式                                      | 使用场景              |
| -------- | --------------------------------------------- | --------------------- |
| 手动发布 | `workflow_dispatch`，显式设置 `dry_run=false` | 常规 DS 包发布        |
| tag 发布 | 推送 `ds-v*.*.*` tag                          | 需要以 tag 固化发布点 |

常规优先使用手动发布。tag 发布前也必须先在同一 `main` 提交上完成 dry run。

workflow 发布顺序固定为：

1. 查询 `@vxture/shared` 当前版本是否已存在。
2. 若不存在，发布 `@vxture/shared`。
3. 查询 `@vxture/design-system` 当前版本是否已存在。
4. 若不存在，发布 `@vxture/design-system`。

相同版本已存在时 workflow 会跳过该包；禁止删除远端 package 后复用同一个版本号。

长期规划：DS 发布不再作为游离的模块级发布能力扩张，而是作为 `publish-*` 包发布体系中的一个清晰入口。未来如果引入统一包发布调度层，应通过输入参数或 job matrix 表达发布对象，例如 `package_group=design-system`，并保持本规范中的 dry run、版本检查、发布顺序和发布后验证规则不变。

## 6. 发布后验证

发布完成后必须验证 GitHub Packages 可读：

```bash
npm view @vxture/shared@<version> version --registry=https://npm.pkg.github.com
npm view @vxture/design-system@<version> version --registry=https://npm.pkg.github.com
```

如只发布 DS 且 shared 未变，可只验证 DS。随后选择一个消费仓库执行：

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
```

若消费仓库安装失败，优先检查 `.npmrc`、GitHub Packages token 权限、package access 和 lockfile 中的版本解析。

## 7. 回滚与补丁

GitHub Packages 版本发布后不可覆盖。出现问题时按补丁版本处理：

1. 新建 `fix/*` 分支修复。
2. bump patch 版本。
3. PR 合并到 `main`。
4. 重新 dry run。
5. 发布新的 patch 版本。

消费端回滚优先通过 lockfile 回退到上一可用版本，不删除已发布包。

## 8. 禁止事项

- 禁止本地直接 `pnpm publish`。
- 禁止绕过 PR、CI 或 required checks 修改版本。
- 禁止真实发布未经过 dry run 的 `main` 提交。
- 禁止复用已经发布过的版本号。
- 禁止把 GitHub Packages token 写入仓库、PR 描述、日志或截图。
- 禁止为了单个消费端临时改 DS 公共入口；必须按 SemVer 和 guardrail 更新。

## 9. 关联文档

- `docs/10-standards/design-system.md`
- `docs/10-standards/design-system-consumer-trial.md`
- `docs/10-standards/design-system-package-convergence.md`
- `docs/40-implementation/packages/design/design-system.md`
- `.github/workflows/publish-design-system.yml`
