# DS 视觉提升二期 · 透明模式 + 清单补齐

分支：`feat/ds-token-tier-phase0`（接批 A–G）。批次编号续用 H–N。

## 0. 依据与边界

| 条       | 内容                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 来源     | owner 指令 2026-08-02：透明模式（参照 admin）、shadcn 目录补齐、布局/icon+内容组合设计 |
| 视觉权威 | admin 内容区（`portals/admin/src/styles/`）的语法，不是它的代码                        |
| 结构权威 | shadcn vega preset（`--base radix`），批 A–G 已对齐                                    |
| 边界     | T1/T2 token 不动值，仅在必要处**新增**语义；不改 admin；产品侧对接留待 DS 打好后       |

## 1. 从 admin 提炼的视觉语法（判据）

| #   | 规则                                                                                   | admin 证据                                                           |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| V1  | 页面唯一实色底；一切容器为半透明白叠层（58/68/72%）                                    | `admin-base-document.css:3`、各卡 `color-mix(white N%, transparent)` |
| V2  | sidebar 与内容区同底、零分隔                                                           | DS `app.css:318` `background: transparent`                           |
| V3  | 语义色只走顶部 2px 描边，永不填卡片底                                                  | `admin-management-core.css:48`                                       |
| V4  | 实线=区块起始（brand 10–16%）；虚线=行/字段/footer 分隔                                | `admin-directory-list.css` / `admin-directory-cards.css:83`          |
| V5  | 表格无容器卡：透明行、水平 padding 0、grid gap 定列距、虚线行分隔                      | `admin-directory-layout.css:3-11`                                    |
| V6  | 页头三栏 grid `auto\|1fr\|auto`；icon 裸色无底块（一级 40 / 二级 32）；copy gap 0.5rem | `admin-overview-core-heading.css`                                    |
| V7  | 图标承载语义色，文字保持中性                                                           | `admin-directory-list.css` 行图标 tone、文字 secondary               |
| V8  | hover = 淡 brand 底（4–10%）+ 前景转 brand，不动 border/shadow/位置                    | §7 交互态表                                                          |
| V9  | 次要操作父容器 hover 渐显（opacity 0→1 + pointer-events）                              | 标题复制按钮等                                                       |

## 2. 不参考清单（admin 的缺陷）

| #   | 缺陷                                              | DS 处理                   |
| --- | ------------------------------------------------- | ------------------------- |
| X1  | 表头 `justify-items:center` vs 行 left 对齐轴冲突 | header/row 同轴           |
| X2  | 720–860 七档字重                                  | 收敛 400/500/600/700      |
| X3  | off-grid 尺寸 2.4rem/.85rem/.94rem                | 落 DS 现有刻度            |
| X4  | 硬编码 `#94A3B8`                                  | 全走 token                |
| X5  | sidebar 清 focus ring                             | 保留 `interactive` 焦点环 |
| X6  | 10 层 `:not()` 选择器                             | 每列语义类名              |

## 3. 批次

### 批 H — 透明表面层（零 token 改动，纯配方）

- veil 三档 = `bg-card/{58,68,72}`（透明度修饰符作用于现有 `--card`，明暗自适应）
- hairline = `border-primary/10 dark:/20`（≈ admin `#1e51ff1f`），实线/虚线分工入配方
- `revealOnHover` 配方（V9）
- T1/T2 无任何改动（owner 规则：token 改动需批准，颜色优先靠现有 DS）
- 附带：generate-foundation 修单值色 alpha 合成的本体解析 bug（`white-alpha-*` 会被误剔）

### 批 I — 标题族（V6）

- ViewHeader / SectionHeader 重写为 icon|copy|actions 三栏语法；level 阶对应 icon 40/32/无、字级取 DS 现有 type 刻度
- 二级带虚线下边框；正文与 icon 轴对齐的缩进规则
- X2/X3 修正落地

### 批 J — Card 族（V1/V3/V4）

- Card 默认透明叠层（veil）+ 1px 边框 + 8px 圆角
- MetricCard 对齐 KPI 卡语法（icon 轨 + tone 顶描边）
- 入口卡形态（icon 色块底 40px）并入 Card 组合或新 pattern

### 批 K — Table/DataTable（V5 + X1/X6 修正）

- 去容器卡：透明行、表头 caption 样式（12px/实线下边框）、行虚线分隔、hover tint
- 行操作列标准化：ghost icon trigger + DropdownMenu、`justify-self:end`
- 分页 footer：虚线上边框、总数左/操作右

### 批 L — 清单补齐·纯 Radix（装分包即可）

alert-dialog, accordion, collapsible, progress, radio-group, slider, toggle, toggle-group, scroll-area, table 原语, hover-card, context-menu, aspect-ratio（13 件）
（menubar / navigation-menu 缓：控制台形态用 sidebar 导航，无消费场景；**alert 不引**：Banner 已以六档 tone 占 inline callout 位，再引=同一严重度两套名字）

### 批 M — 清单补齐·重依赖（收窄）

- 引入：command/combobox（cmdk）、calendar/date-picker（react-day-picker）——控制台筛选/日期区间刚需
- 缓：carousel / chart / resizable / input-otp / form(react-hook-form)——当前无消费场景，按需再引

### 批 N — 预览面 + 全量验证

- 预览背景切到透明模式底色；新组件全部入 registry（axes 齐全）
- 守卫全绿 + 浏览器实测计算值

## 4. 判断记录（owner 未逐条拍板、由本计划定）

| 决策                              | 取向                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 透明叠层落点                      | 零新增：现有 token + 透明度修饰符（`card/58`、`primary/10`）                                                       |
| hover/pressed 换 brand 微染（V8） | **已批（2026-08-02 "accent 改"）**：`accent`=brand-600-alpha-08/15、`surface-active`=15/22，与 selected 成连续刻度 |
| 焦点环                            | 保留（X5）                                                                                                         |
| 重依赖范围                        | 仅 cmdk + react-day-picker，其余缓                                                                                 |
| menubar/navigation-menu           | 缓，无消费场景                                                                                                     |
| Toast/Drawer/DataTable 自研件     | 保留自研，不换 sonner/vaul/tanstack                                                                                |
