# Docs 编号与标识体系（taxonomy）

> **权威**：`docs/` 目录结构、文件命名、标识符的唯一规范。所有产品仓（vxture-platform/arda/karda/varda…）共用。
> **配套**：仓库骨架见 [`repo-governance-standard.md`](./140-repo-governance-standard.md) §10；强制见 `pnpm lint:docs-numbering`。
> **参照**：`vxture-arda` 的 `docs/` 编号分类是范式来源（本文在其基础上把 standards 提前、加元规则）。

---

## 0. 元规则（铁律）

1. **编号 = 正式文件（永久）；无编号 = 临时文件（定位即待删）。概莫能外。**
   连 `index` 也不破例（写作 `00-index.md`）。CI 护栏 `lint:docs-numbering` 把此规则变成硬门。
2. **编号预留空位，不连续。** 一律留插入余量，避免后续插档要全体重排：
   - 顶层目录 = **十进制分段**（`00/10/20…90`）
   - 目录内文件 = **十位跳**（`00/10/20…`，插档用 `15`）
   - 域文档 = **百位分段 + 段内十位跳**（`100/110…`、`200/210…`）
3. **例外**：类型寄存器（`ADR-`/`TD-`）是 append-only 历史日志，**保留既有稳定 ID、永不重排**（新增只追加、可跳号），其"编号"由 ID 本身承载。

---

## 1. 顶层目录（decades）

| 编号                | 目录                                   | 收纳                                           |
| ------------------- | -------------------------------------- | ---------------------------------------------- |
| `00-meta`           | 关于文档本身                           | `00-index` / glossary / contributing / status  |
| `10-standards`      | **全栈工程规范（org 级权威，基础层）** | git-workflow / security / testing / DS / 本文… |
| `20-specs`          | 产品/业务规格                          | product specs、console/tenant spec             |
| `30-design`         | 架构 · ADR · 域设计 · DB schema        | architecture / decisions / 域设计 / schema     |
| `40-implementation` | 分层/包指南 · 编码规范 · dev setup     | packages / coding-rules / setup                |
| `50-deployment`     | 基建 · CI-CD · 环境 · 迁移             | deployment / rebuild                           |
| `60-operations`     | runbook · 审计 · 技术债 · 事故         | audit / tech-debt / runbooks / incidents       |
| `70-workplan`       | 计划 · 路线                            | roadmap / 批次跟踪                             |
| `80-liaison`        | 跨组织对接联络（回函/约定/同步）       | arda 回函、对接契约                            |
| `90-memory`         | 仓内 AI handoff                        | agent.md、handoff 约定                         |

> 未用满时空号保留（如无 workplan 也占住 `70`，勿挪用）。standards 居 `10`（基础层，governs 一切），非末尾。

---

## 2. 目录内文件与子目录编号（每一级都编号）

- **文件** `NN-kebab-slug.md`，`NN` **十位跳**（`10/20/30…`，插档 `15`）；≤9 文件用 2 位、>9 用 3 位（`010/020…`，sort-safe）。
- **子目录也编号**（2 级/3 级/…概莫能外）：普通子目录用 `NN-name/`；**产品子目录用层级编码号**（见 §6）。
- 每目录索引 = **`00-index.md`**（0 位固定给索引/概览）。
- 无编号 `.md`/目录 = 临时，`lint:docs-numbering` 报错（白名单：`README.md`、根级 `CLAUDE.md` 等非 docs 正文）。

---

## 3. 域文档编号 `{kind}_{domain}_{NNN}_{slug}`

数据/域设计类文档用此扁平命名（不靠目录层级区分域），已在 `data_` 系列证明、`lint:data-design` 已校：

- **`kind`** ∈ `data`（数据架构）· `design`（域设计）· `ops`（域运维）
- **`domain`** = 域码表（§5）的 canonical 词
- **`NNN`** 百位分段：**`1xx` 架构 / `2xx` 细化(schema) / `3xx` 实施**；**段内十位跳**（`200/210/220…`）
- 例：`data_platform_100_architecture.md` · `data_commerce_210_billing.md` · `data_platform_310_cutover-runbook.md`

---

## 4. 类型寄存器（append-only，稳定 ID，永不重排）

| 前缀      | 含义     | 位置                             | 规则                                                                                            |
| --------- | -------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `ADR-NNN` | 架构决策 | `30-design/decisions/`           | 合并散落两处后**保留既有号**（`001-005`+`011`/`012`，`006-010` 天然空位保留）；新增追加、可跳号 |
| `TD-NNN`  | 技术债   | `60-operations/`（技术债登记表） | 现行 `docs/60-operations/tech-debt.md` 保持，从 `001` 递增、永不复用                            |
| `RUN-*`   | runbook  | `60-operations/`                 | 文件名 `run-{domain}-{slug}.md`                                                                 |

---

## 5. 域码表（canonical domain slugs）

用域**全词**（非生僻缩写），与 `@vxture/*` 包域、DDL schema 对齐：

`platform` · `identity` · `commerce` · `metering` · `billing` · `provisioning` · `promotion` ·
`sharing` · `model` · `notification` · `support` · `safety` · `product` · `admin` · `varda` · `arda`

新增域先入本表再用。

---

## 6. 产品编号（层级编码）

产品目录（`20-specs/` 下、及任何按产品组织处）用**层级编码号**——**首位数字 = 层**，一眼看出层级、排序即层序，十位跳留空。权威产品矩阵 = `30-design/product/*_matrix`（product_100）。

| 号    | 产品     | 层      | 说明                                              |
| ----- | -------- | ------- | ------------------------------------------------- |
| `000` | platform | L0      | Vxture 平台本身（租户/商业/协议底座）             |
| `001` | varda    | L0 内嵌 | 平台内嵌副驾；**只服务 platform，与其它产品无关** |
| `110` | atlas    | L1      | 模型平台                                          |
| `120` | ontos    | L1      | 语义平台                                          |
| `130` | runa     | L1      | 技能平台                                          |
| `210` | arda     | L2      | 结构化数据平台                                    |
| `220` | karda    | L2      | 知识平台                                          |
| `230` | terra    | L2      | 时空平台                                          |
| `310` | raven    | L3      | 行业 agent                                        |
| `320` | anlan    | L3      | 行业 agent                                        |
| `330` | forge    | L3      | 行业 agent                                        |
| `340` | xuanzhen | L3      | 行业 agent                                        |
| `910` | ruyin    | 层外    | client 端（desktop）                              |
| `920` | umbra    | 层外    | 外部边界 VPN（ruyin.ai）                          |
| `930` | hermes   | 层外    | internal                                          |

- **内嵌专用 agent 不单独编号**（除平台级 `varda=001`）：L1/L2 的"内嵌 agent" = 产品的 agentic 表面，产品号已涵盖；L3 本就是独立 agent 产品。
- **每产品保留 `NN1–NN9` 空位**：将来某产品真长出独立子件（如 varda 之于 platform），届时取 `产品号+1`；不预分空号。
- 产品定义待建者**不预建空目录**——有实际 specs 才建 `20-specs/<号>-<产品>/`。

---

## 7. 强制（`lint:docs-numbering`）

`scripts/guardrails/check-docs-numbering.mjs` 扫 `docs/` 下每个 `.md`：非 `00-index.md`、非白名单、且既不匹配 `NN-` / `{kind}_{domain}_{NNN}_` / `ADR-|TD-` 者 → 报错（= 未编号 = 临时，须编号或删除）。

- **硬门（现行）**：`lint:docs-numbering --strict` 已接入 CI `quality-gate`（始终跑，含 docs-only），
  任何未编号 `.md` 即 fail 拦合并——把元规则"无编号=待删"变成铁律。新增 `.md` 必须编号或删除。

---

## 8. 迁移（分批，每批一 PR，含内链/linter/memory 路径修复）

1. **批 1**：固化本权威 + 护栏脚本（report 模式）+ 更新 `repo-governance-standard.md` §10。✅
2. **批 2**：建 `00–90` 顶层目录骨架，迁移到位，`00-index.md` 就位。✅
3. **批 3a**：简单目录文件加 `NN-` 编号；护栏认 `{prefix}_{NNN}` 已编号。✅
4. **批 3b**：`30-design` 域子目录（identity/commerce/…）+ 文件编号；`20-specs` 产品层级编号（§6）；子目录编号；`platform-alerts-cron-runbook`→`60-operations`；temp 输入稿清理。
5. **批 4**：ADR 统一 `ADR-NNN`（001-005 加前缀保号、11/12→011/012，`30-design/decisions/`）；`lint:docs-numbering --strict` 接 CI 硬门。✅ **迁移完成，214 docs 全编号。**
