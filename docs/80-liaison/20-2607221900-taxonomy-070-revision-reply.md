# 平台线 → karda：070-docs-taxonomy 修订落地回函

> **发件**：vxture-platform（docs 标准 owner）
> **收件**：vxture-karda
> **时间**：2026-07-22 19:00（stamp 2607221900）
> **主题**：回复 `10-2607221756-karda-taxonomy-findings.md`——D1–D4 及顺带 F1/F4/F5/F7/F8 已同批落地
> **状态**：已合，可复核

---

## 1. 落地清单

| #   | 决策/条目                                                         | 落地动作                                                                                                                                                                                             | 位置                          |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| D1  | kind 扩为 `{data,design,ops,product}`，`product` 允许省 domain 段 | `070-docs-taxonomy.md` §3 补说明段；零文件改名，既有 11 篇 `product_*` 即刻合法                                                                                                                      | §3                            |
| D2  | 子目录编号补机检 + 具名例外                                       | `check-docs-numbering.mjs` 新增目录名检查（`NUMBERED_DIR` + `DIR_EXEMPTIONS`）；序列子目录/产品层级编码目录须 `NN(N)-name/`，键控子目录（包名/产品面名/ADR 号/表名/规则名/owner 原稿留档）登记例外表 | §2、§7；脚本 `DIR_EXEMPTIONS` |
| D3  | `220` 归还 karda，vxtpl 迁出产品号段                              | `docs/20-specs/220-vxtpl/` → `20-specs/940-vxtpl/`（层外号段，非产品矩阵成员）；`070` §6 补 `940` 行；`20-specs/00-index.md` 链接同步                                                                | §6；目录已 rename             |
| D4  | 产品仓行使 §3 授权后须固化约定+机检+回报                          | §3 新增义务段，引 karda `docs/00-meta/10-docs-convention.md` 为参照实现                                                                                                                              | §3                            |

**`220` 现已实际空出**，`docs/20-specs/` 下无 `220-*` 目录残留，karda 可随时建立平台侧 spec 目录。

## 2. 顺带条目（同批文本校准，无文件改动风险外的额外变更）

- **F1**：§4 寄存器命名/路径校准到实际——runbook `NN-run-{slug}.md`、技术债表
  `60-operations/10-tech-debt.md`（本仓实际文件本就如此，只是标准正文之前写错）。
- **F4**：§7 补作用域声明（`{kind}_{domain}_{NNN}_` 仅本仓适用），正文与护栏实现的正则表述对齐。
- **F5**：§0.1 明确仅约束 `.md`；README 白名单收窄为 docs 根一级（`ROOT_WHITELIST`，不再按
  basename 全局匹配）；`30-design/inputs/README.md` → `00-index.md`（已编号，同时消解 F5 第 3 点）。
- **F7**：§1 `95-readme` 补回收条件（与 `40-implementation/packages/` 合并去重后删除本目录）。
- **F8**：`30-design/architecture/` 双 `00-` 与个位跳维持历史遗留豁免，注明"新目录不得复制此形态"，
  未做物理重排（引用面过宽、重排收益/风险不对称，见 §2 说明）。

## 3. 未采纳/延后的部分

- karda 报告里 `30-design/{commerce,db,identity,platform}/`、`40-implementation/{ai,development}/`
  这类既有"序列子目录未编号"现象，本轮**未物理重排**——按 D2 的"具名例外"路径处理：先纳入
  `DIR_EXEMPTIONS` 的历史遗留分组（明确标注"不得再新增"），而非强制改名，避免对现有大量内链
  做一次性大范围改造。新建同层级目录起必须编号，护栏已生效拦截。

## 4. 复核

`pnpm lint:docs-numbering`（即 `check-docs-numbering.mjs --strict`）在本仓当前 239 篇 `.md` 上
全绿（含新增的子目录检查维度）；`lint:data-design` 同步跑绿，未受影响。

070 修订详见 `docs/10-standards/070-docs-taxonomy.md`（§1/§2/§3/§4/§6/§7/§8 均有改动，§8 批 5 记录本轮）。
