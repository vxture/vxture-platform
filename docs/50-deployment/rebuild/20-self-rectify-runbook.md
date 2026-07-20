# 仓库自整顿 Runbook（照 org 标准自执行）

> **用途**：任意 org 产品仓（arda/karda/varda…）**照本文自行整顿**到 org 标准——**不靠人代劳**。
> **标准权威**：[`../../10-standards/140-repo-governance-standard.md`](../../10-standards/140-repo-governance-standard.md)（要求 WHAT）
>
> - [`../../10-standards/070-docs-taxonomy.md`](../../10-standards/070-docs-taxonomy.md)（docs 编号）。
>   **参照实现**：`vxture-platform`——本文引用的脚本/workflow/config 从该仓对应路径复制。
>
> **执行模型**：标准是明确+严格且**机器可验**的（每步附验收命令，绿=达标）。仓 owner/agent 逐批做、逐批验收；
> 硬门（CI required check）保证不达标即拦合并。**不达标 = 未完成，无需人主观判断。**

---

## 0. 可移植工具清单（从 vxture-platform 复制）

| 类别            | 文件                                                                                                                                             | 适用          | 说明                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------- |
| **密钥扫描**    | `.gitleaks.toml` · `.github/workflows/secret-scan.yml` · `.husky/pre-commit`                                                                     | **全仓必备**  | gitleaks pinned 二进制                                  |
| **SCA**         | `.github/workflows/ci.yml` audit job · `.osv-scanner.toml`                                                                                       | **全仓必备**  | osv-scanner pinned；`--config` 必带                     |
| **docs 编号**   | `scripts/guardrails/check-docs-numbering.mjs`（纯 node、零依赖）                                                                                 | **全仓必备**  | `--strict` 接 CI；package.json 加 `lint:docs-numbering` |
| **CI 变更门控** | `scripts/workflows/classify-changes.mjs` + `.test.mjs` + `images.mjs`                                                                            | 有多镜像时    | build/test 只建受影响组件                               |
| **分支保护**    | `main-ruleset.json`（本目录）                                                                                                                    | **全仓必备**  | required checks + 禁 force-push + 线性历史              |
| **CI/CD 模板**  | `.github/workflows/{ci,build,deploy}.yml` + `actions/`（`build.yml` = deploy 经 `workflow_call` 调的可复用 build，正典无竞态；见 governance §4） | 有部署时      | 稳健 CD 构件见 governance §4                            |
| **数据层护栏**  | `scripts/guardrails/check-{data-architecture,catalog-domains,column-locks,schema-residue,seed-idempotency}.mjs`                                  | **仅自带 DB** | governance §7/§8                                        |
| **前端护栏**    | `scripts/guardrails/check-design-system.mjs` · `check-i18n-keys.mjs` · `audit-env.mjs`                                                           | 有对应形态    | governance §8                                           |

> 复制后按本仓实际改路径/包名/registry；**勿照抄 vxture-platform 专属值**（namespace/host/域码）。

---

## 1. 分批步骤（每批一 PR，附验收命令）

### 批 A — 主干 + 分支保护（governance §1）

- 弃 gitflow（删 develop/beta、`PROMOTION_*`、`deploy-production.yml`）；单 `main`。
- apply `main-ruleset.json`（**空仓先首推 + 跑一次 CI 让 required checks 产生，再 apply**）。
- **验收**：`gh api repos/{o}/{r}/rulesets` 有 branch ruleset；required checks 含 `quality-gate`/`build`/`test-coverage`/`audit`/`gitleaks`。

### 批 B — 敏感信息四层（governance §2/§3）

- push protection 开 + gitleaks CI + pre-commit + `.gitleaks.toml`；**仓公开（开发阶段）**；清误标开源残留。
- secret/variable 分类正确、分层（org/repo/env）、无死值。
- **验收**：`gitleaks detect --no-banner`（全史 0 命中）；CI `gitleaks` 绿。

### 批 C — SCA 硬门（governance §9）

- osv-scanner audit job（pinned + `--config=.osv-scanner.toml`），加入 required。
- **triage 清基线**：直接依赖抬 floor / 传递依赖 `pnpm.overrides` / peer 精确 pin / 不可修残留 `[[PackageOverrides]]` 记名。
- **验收**：`osv-scanner --config=.osv-scanner.toml --lockfile=<lock>` → `No issues found`；CI `audit` 绿（非 `continue-on-error`）。

### 批 D — docs 编号体系（docs-taxonomy）

- 顶层十进制段（`00-meta`…`90-memory`，standards 居 `10`）+ 每级子目录编号 + 产品层级号（§6）+ 域文档 `{kind}_{domain}_{NNN}` + `ADR-/TD-NNN` 寄存器。
- 每 package 一个薄 `AGENTS.md` 入口 → docs；内容归 `docs/`；已发布包留 README（registry）。
- `lint:docs-numbering --strict` 接 CI `quality-gate`。
- **验收**：`node scripts/guardrails/check-docs-numbering.mjs --strict`（exit 0，全编号）；全仓 md 链接 0 断链。

### 批 E — CD + 环境 bootstrap（governance §4/§5/§6）

- tag→env（**产品仓默认 beta/v 两档**；`dev`/`varda` 为平台仓特有）；稳健 CD 构件（`tailnet-ssh-connect` 复合动作 · `@v4+ping` · 原生 ssh+rsync · sha-tag · login fallback · bootstrap `.env` · VERSION）。
- 每部署目标一个 Environment（自带 `DEPLOY_*` + `DEPLOY_DIR` 精确 + **Required reviewers**）；ACR namespace 从 `vars`。
- **验收**：真打一个 `beta-*` tag → CI 全绿 + 部署 + 健康校验 200（生产档 `v*.*.*` 另加必审人门）。

### 批 F —（仅自带 DB）数据层（governance §7）

- DDL 单一权威 + @shared 值域 + 最小权限/列锁 + 活库增量幂等。
- **验收**：`pnpm lint:data-design && pnpm lint:catalog-domains && pnpm lint:column-locks && pnpm lint:seed`（全 0 error）。

### 批 G — 仓库骨架（governance §10）

- 根配置（`.editorconfig`/`.gitattributes`/`.npmrc`/`.gitleaks.toml`/`CLAUDE.md`…）+ `docs/` 编号分类骨架。
- **验收**：骨架对齐 §10；`check-docs-numbering --strict` 绿。

---

## 2. 总验收（一条龙，全绿=达标）

```
gitleaks detect --no-banner \
  && osv-scanner --config=.osv-scanner.toml --lockfile=pnpm-lock.yaml \
  && node scripts/guardrails/check-docs-numbering.mjs --strict \
  && pnpm type-check:all && pnpm --recursive --if-present lint
# 有 DB 再加 lint:data-design / catalog-domains / column-locks / seed
```

CI 侧：`main` 的 required checks（`quality-gate`/`build`/`test-coverage`/`audit`/`gitleaks`）全绿即分支保护达标。
**任一红 = 未达标，继续整改**——不需人主观判断"够不够好"。

---

## 3. 边界

- 各仓**自整顿**：owner/该仓 agent 照本文做；vxture-platform 只提供标准 + 参照实现 + 工具，**不代做**。
- 跨仓 org 级凭证/资源（ACR/tailscale/registry）由 owner 统一配；写外部仓/主机须逐仓授权。
- 有本文未覆盖的新缺口 → 先补进 governance/taxonomy（标准演进），再各仓照新标准整顿。
