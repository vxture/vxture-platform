# admin 接入 DS —— 分析与规划

**前置**：`admin-css-absorption-inventory.md`（结构盘点，任务 #20 产出）。本文回答的是
盘点之后的问题：**怎么接、按什么顺序接、哪些要先在 DS 侧补齐**。

---

> **2026-08-05 已修复。** 下面这一节记录的是本轮开工时的状态。取值层已按原值恢复
> （DS `assets/admin-tokens/`，545 个变量全部取自 git），失效声明 **33.9% → 0%**。
> 修复的由来见第十节——本文前半程把这些 CSS 当成"待清理的死代码"，那是误判：
> admin 的页面样式是几个应用里效果最好的一套，缺的只是被抽走的取值层。

## 一、开工时的状态：admin 的页面 CSS 有三分之一是失效的

| 量             | 值                                             |
| -------------- | ---------------------------------------------- |
| 页面 CSS 文件  | 145 个 / 12857 行 / 4234 条声明                |
| 引用未定义变量 | 1787 处裸引用（无 fallback 的只有 1 处外全裸） |
| 因此失效的声明 | **1437 条 = 33.9%**，波及 103/145 个文件       |

失效集中在骨架属性上，不是装饰：

```
 380  gap                    298  font-size
 114  padding                 80  grid-template-columns
  78  height                  64  box-shadow
```

`var(--x)` 未定义且无 fallback ⇒ 该声明 invalid at computed-value time ⇒ 属性回落到
继承值/初始值。所以现在 admin 页面上：栅格塌成单列、间距归零、字号继承。

**成因不是事故，是计划内的欠账。** `8ca6284e`（2026-07-31）退役 legacy token 层，
commit message 自己写着 "Products converge to the tier layer in batches" —— admin 就是
那个还没收敛的产品。

### 这件事对规划的三个影响

1. **不存在"迁 DS 会破坏 admin 现有视觉"的风险** —— 没有现有视觉可破坏。这把整件事
   从"高风险替换"降级为"修复"。
2. **旧 CSS 不能当安全网。** 保留它不提供回滚价值，因为回滚回去也是坏的。
3. **owner"不删 admin style"的要求依然成立，且理由变了**：这些 CSS 现在是**设计意图
   的唯一记录**——渲染已不可信，源码还可信。吸收的对象是结构与意图，不是当前渲染。

---

## 二、第二个事实：DS 已经吸收了一部分，admin 没回接

`MetricCard` 的 props 注释里写着：

> 默认 `brand` 而非 `neutral`：admin KPI 卡的既有视觉是"默认即品牌蓝"（顶缘 + 读数 +
> 图标同色）…（2026-08-03 opera 对照 admin 实测）

也就是说 DS 侧的 `MetricCard` / `MetricListCard` **就是照 admin 的结构抽象出来的**，
但 admin 自己仍在用 `SummaryItem`。盘点文档里"A1 待拍板：扩 ListCard 还是新建
MetricListCard"这个悬案，已被后来的工作回答了——`MetricListCard` 已存在，只是全仓
只有 1 个门户文件在用。

**所以"接入 DS"的主体不是新建，是回接已经吸收好的成果。**

---

## 三、admin 现状的量化底盘

| 维度                      | 值                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 页面模块                  | 58 个 tsx / 37003 行，24 个业务域                                                                                           |
| 每页 legacy className     | 27–86 处（TenantDetailPage 86，ModelPlatform 73）                                                                           |
| 每页 DS import 行         | **1–2 行**                                                                                                                  |
| 裸 `div`/`span`/`section` | 751 / 1064 / 194                                                                                                            |
| **同名本地组件重复定义**  | `SummaryItem`×8 · `DetailMetric`×6 · `DetailField`×6 · `SectionHeading`×5 · `Pagination`×5 · `PageSizePicker`×2 = **32 份** |

最后一行是这次的最大杠杆：32 份复制粘贴，对应 DS 里 6 个现成组件。

---

## 四、三分类

### A · 直接换（DS 已有等价物，admin 只是没回接）

| admin 现状                                | 换成                                      | 消灭               | 范例                 |
| ----------------------------------------- | ----------------------------------------- | ------------------ | -------------------- |
| `SummaryItem`（8 份私有定义）             | `MetricCard`                              | 8 份 + 41 处引用   | opera 已用           |
| `DetailField` / `DetailMetric`（各 6 份） | `DetailRow` / `DetailList`                | 12 份 + 153 处引用 | console 9 个文件已用 |
| `SectionHeading`（5 份）                  | `SectionHeader`                           | 5 份               | —                    |
| `Pagination`（5 份私有）                  | `Pagination`（DS）                        | 5 份               | admin 已部分换       |
| `PageSizePicker`（2 份）                  | `SegmentedControl`                        | 2 份               | admin 已部分换       |
| 各页 `*-toolbar`（13 处）                 | `FilterBar`                               | —                  | —                    |
| 页面骨架 `div` 三段式                     | `ListPageTemplate` / `DetailPageTemplate` | —                  | console 9 处已用     |

**判据**：props 形状已经对齐（`SummaryItem{icon,label,value,tags,tone}` vs
`MetricCard{icon,label,value,trend,tone}`），是机械替换，不需要设计决策。

### B · 提升后迁入 —— **owner 2026-08-05 收口**

**剩余 15 个列表页不迁 `MetricListCard`，保留在 admin，基于 DS 的原子件重构。**
理由：它们与业务耦合强；共享件应当等**第二个消费方**出现再建，而不是先造出来等人用。
已迁的四个（tenants / orders / billing / invoices）保持现状——它们已验证 `MetricListCard`
的形状成立，也为将来第二个消费方留下了参照。

`MetricListCard.note` 与 `modules/shared/status-tone.ts` 已落地（`5886d0da`），不作废：
前者是四个已迁页面在用的槽，后者是 admin 自己的映射表，本就该留在 admin。

下面原表保留作为背景，不再是待办。

| #   | admin 结构                               | 出现       | DS 现状               | 要补的                                    | 风险   |
| --- | ---------------------------------------- | ---------- | --------------------- | ----------------------------------------- | ------ |
| B1  | 带卡内指标的列表卡                       | 4 域 17 处 | `MetricListCard` 已在 | **先核实覆盖度**，可能零改动              | 低     |
| B2  | 状态点（无文字纯圆点）                   | 14 处      | `StatusBadge` 有徽章  | `dot` 形态（一个 variant，非新组件）      | 低     |
| B3  | 卡片形态的选中态                         | 13×3       | `DataTable` 只管表格  | `ListCard`/`MetricListCard` 的 `selected` | 中     |
| B4  | **卡表同源：一套列定义驱动表格行与卡片** | **170 处** | `DataTable` 只出表格  | `DataTable` 加 `cards` 渲染模式           | **高** |

B4 是盘点里的 A2，收益最大（170 处，几乎每个域）也最危险——做歪了变成谁都不敢碰的
巨件。**建议压到最后**：A 类做完后重新数一遍，很可能真实需求远小于 170。

### C · 新建

**目前一件都不需要。** 这是盘点之后的新结论——DS 的组件表已经覆盖到 admin 的所有
通用结构。真正 admin 独有的（权限树）属于 D 类。

### D · 不进 DS（业务语义，留在 admin）

| 结构                                                                | 规模                 | 处置                                                                                                             |
| ------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| pill 色调族（`--tier/--bill/--payment/--invoice/--ticket/--quota`） | 244 个选择器、3 文件 | **形状**用 DS `Badge`；**业务状态 → tone 的映射表**留 admin。DS 零业务语义是硬规矩，`tone.ts` 拒收业务状态是先例 |
| `vx-admin-permission-tree-*`                                        | 19                   | admin 独有治理形态，等第二个消费方出现再谈上提                                                                   |
| 各域一次性页面样式                                                  | —                    | 只在一个页面出现，是页面样式不是模式                                                                             |

---

## 五、顺序

原计划按"列表页（3.2）→ 详情页（3.3）"分批。**建议改为按重复度杠杆分批**——因为
`DetailField` 抄了 6 份、`SummaryItem` 抄了 8 份，它们横跨列表页与详情页，按页面切
会把同一次替换切成六次。

| 批    | 内容                                               | 状态                                                                                   |
| ----- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **1** | A 类重复定义 → DS 组件（实际 60+ 份，非 32）       | ✅ `ad33f26a` `11dd3d37` `394cfad4` `862207b7` + 页头修正 `9c7f815a`                   |
| **2** | B1 列表卡                                          | 部分：4 页已迁 + DS `note` 槽 + tone 映射表（`5886d0da`）；**剩 15 页 owner 决定不迁** |
| **3** | 页面骨架换 `ListPageTemplate`/`DetailPageTemplate` | ✅ 30 列表页 + 7 详情页；`ModelGrantsPage` 判定不适用，见 §十二                        |
| **4** | pill 色调族 → `Badge`                              | 进行中：商业域 5 页已收（见 §十三）；剩 ~19 族                                         |
| **5** | B3/B4（卡片选中态、卡表同源）                      | 未评估                                                                                 |
| **6** | 登录态视觉走查                                     | 未开始                                                                                 |

**列表本体的收敛另起一条线**：`admin-table-consolidation.md` —— 29 个手搓列表页约 3279 行，
按结构相似度分 T1–T5 五批（`rowTone` 曾作为唯一缺口补齐，后于 2026-08-05 owner 实测后退役——行的语气改由状态列表达，见 `950ac3ae`）。本份的批 3
（页面骨架）与批 4（pill）与之相邻但不同批：一次改动不跨两个语义面。

**A 类的实际规模是盘点的两倍。** 每一批都炸出同一族的三种形态：裸名定义、带模块前缀的
定义（`TenantSummaryItem` / `ProductPagination`…）、完全不封装的内联 JSX。**按函数名搜会
漏三分之二，类名口径才可靠**——A1 之后改用类名口径，后三批没再漏。

---

## 六、旧 CSS 的处置（需要 owner 认可）

owner 明确要求**不删**。但迁移后它们会变成纯死代码：选择器无人引用，且其中 34% 本就
失效。三种处置：

1. **原样留在 `styles/` 并继续 import** —— 构建产物里带着 12857 行死 CSS，且它们仍会
   参与选择器匹配（有撞名风险）。
2. **移到 `styles/_absorbed/`，从 `globals.css` 摘掉 import** —— 文件保留作为设计意图
   存档，不参与构建。**推荐这个**：满足"不删"，同时不让死代码影响运行时。
3. 删除 —— owner 已否决。

---

## 七、拍板情况

**① B4（卡表同源）做不做？** 未评估，留待批 5。

**② pill 的映射表放哪？** ~~待拍板~~ —— **已由既有文件回答**：
`@vxture/shared/status-tone.constants.ts` 早已存在，写明了为什么放 shared、为什么不放
`catalog-domains.constants.ts`，并划了边界——**只映射 shared 已经拥有值域的状态**，其余
"先有值域契约，再谈它的展示映射"。订单 / 账单 / 发票 / 对账态在 shared 里没有值域，
按这条规矩落在 `admin/modules/shared/status-tone.ts`。

真正待拍的是它的下一步：**哪些状态该向 shared 补值域契约**。那要等 pill 的 244 个
选择器盘完才有依据，属批 4。

**③ 旧 CSS 用第六节的哪种处置？** 仍待拍板。注意这已不只是"死代码"问题——见下节。

---

## 九、上线前必须知道的：迁移只覆盖了失效面的一角

第一节量到 admin 页面 CSS **33.9% 的声明失效**（1437/4234，103/145 个文件）。本轮迁移
换掉的是**重复组件**，不是整套页面样式：`vx-tenant-summary` / `vx-product-capability-*` /
`vx-tenant-pagination` / `admin-overview-heading` 等已彻底无人引用，但 `vx-tenant-directory-*`
（列表行栅格，170 处）、pill 族（244 选择器）、各域一次性页面样式仍在用，其中的失效声明
照旧失效。

**这不是本轮引入的**（`8ca6284e`，2026-07-31），上线不会让情况变差；已迁的部分反而是净
修复——例如列表卡的顶缘色条此前因失效变量根本没渲染，迁到 `MetricListCard` 后恢复了。

要把失效比降下去，靠的是批 3（页面骨架）与批 4（pill），不是继续迁列表卡。

---

## 八、验收（每批都要过）

- `pnpm --filter @vxture/admin type-check` 绿
- `pnpm lint:design` 不退化
- `pnpm --filter @vxture/admin build` 通过
- 该批涉及页面的登录态实际渲染核对（不是截图肉眼，是 DOM 结构遍历）
- 失效声明数复测：批 1–3 后重跑扫描，`33.9%` 应显著下降

---

## 十、取值层恢复（2026-08-05）—— 一次方向性纠偏

### 我误判了什么

本文第一节量到"33.9% 声明失效"之后，我把结论下成了「这些 CSS 是坏的，迁 DS 等于修复」，
于是一路做「判死 → 移出构建 → 存档」。**owner 保留 admin CSS 的本意不是存档留念**：
admin 原本是几个应用里视觉效果最好的，那套样式是资产，应当

1. 在 admin 内继续生效，且
2. 其中通用的部分沉淀进 DS。

我两条都没做，还把页面留在了"除 DS 组件外全是简单堆叠"的状态。

### 真实原因不是 CSS 坏了，是取值层被抽走了

`8ca6284e`（07-31）退役 legacy token 层时，把 admin 页面样式赖以取值的变量一并删了。
CSS 本身没问题——`var()` 找不到值，整条声明才 invalid。

**545 个缺失变量 100% 能从 git 取回**（`8ca6284e~1`），无一处需要臆造：

| 形态           | 数量 | 说明                                                     |
| -------------- | ---- | -------------------------------------------------------- |
| rem 裸值       | 283  | 待逐批换成 T1–T3 语义 token 的引用                       |
| 别名转发       | 210  | 保留不压平——那层记录了原设计的语义分层                   |
| px 裸值        | 29   | 同 rem                                                   |
| 其他（颜色等） | 23   | 其中 6 个 shell 色改指 DS 现存的**主题感知**语义色，见下 |

`--vx-shell-ink` / `-surface` / `-muted` 这类原本是亮 / 暗两份硬编码，或转发到同样已死
的目标。恢复时一律改指 DS 现存的 `--vx-color-shell-*`——主题跟随由被转发者负责，比恢复
两份硬编码更对，也正是"收敛到 tier 层"该走的方向。

### 落点：DS 的 `assets/`，不是 admin

守卫 `ds/no-app-vx-token-definitions` 规定「应用层不能定义 `--vx-*` token，要回收到
`@vxture/design-system`」。同时这些是 admin 的产品绑定层，不该混进 DS 的公共刻度
（`src/styles/`）。`assets/` 正是这类「DS 托管、单一产品消费」样式的既有位置——
`shell-template` 是同一先例。

    packages/design/design-system/assets/admin-tokens.css        ← 入口
    packages/design/design-system/assets/admin-tokens/tokens-admin.css
    package.json exports: "./styles/admin-tokens.css"

### 结果

失效声明 **1437 / 4234 (33.9%) → 0 / 3734 (0%)**。构建产物实测取到值
（`--vx-admin-directory-card-padding:1.5rem`）。

### 它是桥，不是终点

283 个 rem + 29 个 px 裸值应逐批换成 T2 引用，其中通用刻度（卡片内边距、列表行高、
菜单尺寸）值得沉淀进 DS——**这就是 owner 说的"沉淀在 DS 中"**。等 admin 页面 CSS 直接
用上 T2，`admin-tokens` 即可缩小直至消失，那才是 `8ca6284e` 写的
"Products converge to the tier layer in batches"。搭桥再过河，而不是拆了桥让人游过去。

## 十一、状态类与值域的对账（2026-08-06）

起因是一次"死代码排查"：CSS 里定义、tsx 里搜不到的类有 127 个。按类名整体比对会
误判——`vx-order-pill--payment-${status}` 这类是模板拼出来的，尤其带下划线的状态值
（`pending_verify`、`bill_cancelled`）不可能在 tsx 里以字面量出现。改成按前缀逐段
回退匹配后降到 19 个，那 19 个才是批 1 迁 DS 之后的遗留（`vx-btn` / `vx-empty-state` /
`vx-view-mode-switch` / `vx-page-header*`），已随本轮清理退役 213 行。

**判据记下来**：判断 CSS 类是否在用，必须考虑模板拼接。只做字面量比对会删掉线上正在
用的状态色，而且删掉之后页面只是"变灰"，不报错、不崩，测不出来。

余下 108 个逐条对了值域（权威：`@vxture/shared` 的 catalog-domains，以及 admin
`entities/console.ts` 的联合类型）。**没有一个是垃圾**，但对出三类真问题：

### 1. 缺色：状态有值，CSS 没有对应类

| 家族                                                    | 缺的值                                  | 后果                                                                                |
| ------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| `vx-order-pill--*`                                      | `paid_unprovisioned`、`partial_pending` | product_321 §4.2 新增的两个非终态，CSS 没跟上，标只剩基础样式，与正常订单看不出差别 |
| `*-pill--tier-*`（order / billing / subscription 三处） | `starter`、`business`                   | @shared 的 TIERS 是五档，admin 只写了 free/pro/enterprise，另两档掉进 `other` 灰色  |

第二条是等级色 L1–L5 的实证需求：五档里有两档在视觉上根本不存在。

**去向：批 4**（pill 族 → Badge + 业务状态映射表）。现在临时补 CSS，批 4 时还要拆。
tier 那条直接用已落地的 `--level-1..5`。

### 2. 契约漂移：admin 的订阅状态与 @shared 对不上

```
@shared（唯一权威）：active trialing overdue suspended expired  cancelled
admin 的类型与 CSS ：active trial    overdue suspended expiring cancelled
```

`trialing→trial` 是改名；`expired→expiring` 不是改名——"快到期"与"已过期"是两件事，
admin 侧因此**没有"已过期"这个状态**。CSS 只是跟着 admin 的类型走，根因在 view-model。

**去向：不属于 DS 线**，归 admin-bff view-model 那条（与 console-bff 的同类漂移一并处理）。

### 3. 前缀撞车：一个前缀被两个字段共用

```tsx
vx-invoice-pill--type-${invoice.billType}     // adjust / normal / prepaid / supplement
vx-invoice-pill--type-${invoice.invoiceType}  // electronic / paper / normal_vat / special_vat / other
```

两个值域挤在 `--type-` 下。今天没撞是因为值恰好不重名；将来任一侧新增同名值，颜色会
互相覆盖且无声。**去向：批 4 顺手拆成 `--bill-type-` / `--doc-type-`。**

### 同批的其他排查结论（均无问题）

- 111 份样式文件全在 `globals.css` 的 import 闭包里，无孤儿文件。
- 548 个 `--vx-admin-*` token 全部在用。
  **2026-08-06 复测已不成立**：534 个定义里 74 个无人 `var()` 引用，主要是
  `--vx-admin-platform-*`（33）与 `--vx-admin-overview-*`（32）。核对 git 后确认
  这两族在 HEAD 上就已经没有引用方，**不是 DataTable 迁移造成的**，归批 §十的
  桥收敛（任务 #34）一并清。T5 收尾自己产生的 14 个 `--vx-admin-governance-*`
  孤儿已随改动删除。
- 无人 import 的模块只有 `src/modules/shared/index.ts`（5 行空壳桶），已删。

## 十二、批 3 收尾（2026-08-06）—— 两页判定为不适用

`ListPageTemplate` 覆盖 30 个列表页、`DetailPageTemplate` 覆盖 7 个详情页。本轮补的四页：

| 页面                | 槽位映射                                                                      |
| ------------------- | ----------------------------------------------------------------------------- |
| `OpsTodosPage`      | header / summary / table（table 里是那个带 SegmentedControl 的 `Section`）    |
| `TicketsPage`       | header / summary / filters / table；抽屉与批量对话框留在模板外，用 `<>` 包    |
| `ServiceHealthPage` | header / summary（feedback + 自建的四张概览卡）/ filters（自建工具行）/ table |
| `TenantDetailPage`  | header（返回链接 + 可折叠概要，用 `<>` 包成一段）/ children（分页签主体）     |

**两页判定为不适用，不强套模板**：

- `PlatformAutonomyPage` 已经在用 `DashboardTemplate`——它是仪表盘不是列表页。此前把它
  列进待办，是因为那次扫描的口径是"有 `DataTable` 却没 `ListPageTemplate`"，口径本身错了。
- `ModelGrantsPage` 是**两张互相独立的表**（模型策略 + 覆盖授权），各自带工具行与分页。
  `ListPageTemplate` 只有一个 `table` 槽，把两张塞进去等于取消这个槽的语义，只包第一张
  则更糟。多列表页需要的是另一种模板，不是把这件撑大（owner 2026-08-06「宁可多建件」）。

**踩到的坑**：`TenantDetailPage` 有两个 `ViewLayout`——主体一个，`!tenant` 早退分支一个，
两处 className 完全相同。按"第一个 ViewLayout"定位会把文件从早退分支处截断。改动这类文件
前先数一遍同名根节点。早退分支保持 `ViewLayout` 不动：它是"未找到"占位，没有详情页结构。

## 十三、批 4 第一刀：状态标与分类标要分开算（2026-08-06）

动手前把 247 个 pill 选择器按**实际色值**聚了一次类，结论比"239 个选择器"这个数字有用得多：

| 色                        | 选择器数 | 是什么                                               |
| ------------------------- | -------- | ---------------------------------------------------- |
| `--tenant-amber`          | 61       | 状态 → `warning`                                     |
| `--vx-color-gray-500/600` | 62       | 状态 → `neutral`                                     |
| `--tenant-green`          | 44       | 状态 → `success`                                     |
| `--tenant-rose`           | 37       | 状态 → `danger`                                      |
| `--tenant-blue`           | 19       | 状态 → `brand`（沿用 `status-tone.ts` 的既定对应）   |
| `--vx-color-purple-600`   | 10       | **不是状态**：tier-enterprise ×4、product--model ×3… |
| `--tenant-cyan`           | 8        | **不是状态**：product--agent ×4、tenant--individual… |

**所以这一族其实是三样东西**，处置必须分开：

1. **状态标**（~217）→ `StatusBadge tone=`。语气表 `modules/shared/status-tone.ts` 早就有，
   本轮只补了 `PAYMENT_STATUS_TONE` 与 `QUOTA_RISK_TONE` 两张。
2. **等级标**（tier free/pro/enterprise，紫是 enterprise）→ 归 `--level-1..5` 阶梯。
   **等级是序不是语气**：DS 六档语气里没有"高一级"，套上去只会被读成状态。未做。
3. **分类标**（产品类型 platform/model/agent、主体类型、权限层 L1–L3）→ **留 admin**。
   业务分类不是语气，DS 零业务语义（§四D 早已这么写）。紫、青两色的存在理由就在这里。

### 本轮完成：商业域 5 页

`BillingPage` / `PaymentsPage` / `InvoicesPage` / `OrdersPage` / `SubscriptionsPage`
的账单态、发票态、订单态、支付态、对账态、订阅态、配额风险全部换 `StatusBadge`；
`admin-management-pills-commerce.css` 253 → 83 行。剩在页面里的 pill 只有分类标
（tier / type / tax / source / cycle），这是有意的。

**顺带修掉 §十一 的前缀撞车**：`vx-invoice-pill--type-` 原先被 `billType`
（adjust/normal/prepaid/supplement）与 `invoiceType`（electronic/paper/normal_vat/
special_vat/other）两个值域共用，`normal` 在两边都出现——今天没炸是因为恰好同色。
拆成 `--bill-type-` 与 `--doc-type-`。同时删掉 `.vx-billing-pill--type-*`：全仓无人引用。

**账单异常标的紫色没了**：调整单（蓝）与补录单（紫）原是两色，DS 无紫档，两者同归
`brand`。判据是它们本来就有"调整单""补录单"两个词，区别不必靠记颜色。

### 第二刀：纯状态族（2026-08-06）

四个族**整族都是状态**，页面里各有一个 `*PillClass()` 函数在拼类名，改动收敛在函数上：

| 族                          | 页面                                      | 改成                                                     |
| --------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `account-status-pill`       | `AccountsPage`                            | `ACCOUNT_STATUS_TONE` 表                                 |
| `admin-role-status-pill`    | `AdminRolesPage` / `AdminPermissionsPage` | `roleStatusTone()`                                       |
| `platform-user-status-pill` | `PlatformUsersPage`                       | `platformAdminStatusTone()` / `platformRoleStatusTone()` |
| `verification-pill`         | `VerificationsPage`                       | `VERIFIED_TONE` 表                                       |

换之前逐档查了原色，几处**不能想当然**的：`invited` 是蓝不是黄（邀请中不是异常）、
`pending`（平台用户）同理、`archived` 角色是黄不是灰（归档角色仍可能挂着人）、
`unverified` 是灰不是红（还没提交 ≠ 审核不过）。

### 复测

pill 引用 266 → 210 处，选择器 239 → 146 个，admin CSS 6484 → 6273 行。

### 还剩

**五个混合族**——状态、等级、分类挤在同一个前缀下，得逐档拆：

| 族                      | 档数 | 混了什么                                                                                                     |
| ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `tenant-pill`           | 39   | 状态 + 类目（company/individual/member/owner/permission/product/quota/ticket）+ risk-\*/ticket-\* 两套子刻度 |
| `product-pill`          | 18   | 状态（active/draft/archived、access-\*）+ 类目（agent/model/platform/self/partner/data/service）             |
| `product-solution-pill` | 15   | 同上 + tier-\*                                                                                               |
| `service-plan-pill`     | 14   | 同上 + solution-\*                                                                                           |
| `product-plan-pill`     | 10   | 状态（active/inactive、public/private）+ 类目（agent/free/paid/function/quota）                              |

外加**等级标归 `--level-1..5`** 一项（`billing`/`order`/`subscription`/`product-solution`
四族的 `tier-*`，以及 §十一 的缺色 starter/business）。

### 第三刀：六档对应关系 + 产品四族（2026-08-06，owner 全部认可）

**先把六档的语义定死**（写在 `status-tone.ts` 头部，参照 Atlassian Lozenge——业界把
状态标切成六档的现成参照，与我们一一对得上；Ant Design 只有五档、缺 new 那一档）：

| 档      | 语义                         | 典型值                              |
| ------- | ---------------------------- | ----------------------------------- |
| neutral | 没有状态：未开始/归档/不适用 | archived, unverified, not_required  |
| brand   | 新来的，等人接手             | invited, 待激活                     |
| info    | **正在走流程的中间态**       | applying, auditing, sending, paying |
| success | 达成、正常、闭环             | active, paid, verified              |
| warning | 要留意，但还没坏             | trial, expiring, partial, 待审      |
| danger  | 坏了、被拒、被阻断           | failed, rejected, overdue           |

**`info` 此前一直空着**：前两刀的映射表是照 CSS 逐条抄的，而 CSS 里蓝只有一个，
于是所有蓝都写成了 `brand`。按上表回头改了 7 处——发票的四个"…中"（申请中/审核中/
寄送中/已开票）原先全是黄，等于告诉运营有四件事要处理，实际它们是流程在走；
账单 `paying`、支付 `pending`/`refunding` 同理。

**产品四族合成一张表**（新文件 `modules/shared/publish-tone.ts`）。逐档比色后发现
`product` / `product-solution` / `service-plan` / `product-plan` 的状态档**一字不差**
——active 全绿、draft 全黄、archived 全灰、public 全绿、internal 全灰。四个前缀装的是
同一张表，分开写不是在区分什么，是抄了四遍。

同时收敛两处原设计的不一致：

- **「不公开」两个词两个色**：套餐版本 `private` 标黄，方案与服务套餐 `internal` 标灰。
  统一到 `internal`/灰——不对外可见是一种归属，不是需要留意的信号。
- **类目色里有一个红**：产品类型原是 platform=蓝 / model=紫 / agent=青 / data=绿 /
  service=**红** / self=灰 / partner=黄。「服务类产品」的红会和「订单逾期」的红在同一屏
  抢读。**类目一律 `neutral`**（`categoryTone()`）：并列的类目没有严重度，靠文字与图标分。

顺带查出**接入态 CSS 定义了 8 档、值域只有 4 个**——`ready`/`draft`/`partner_config`/
`policy_missing` 是更早一版值域的残留，退役。新表里另纠两处：`testing`（测试中）→ `info`，
`not_required`（无需接入）→ `neutral`，它不是一项达成。

`admin-management-pills-products-service-plans.css` 清空后删除。

**复测**：pill 引用 266 → 173 处，选择器 239 → 93 个，admin CSS 6484 → 6087 行。

### 第四刀：拆掉 `vx-tenant-pill` 这个漏斗（2026-08-06）

39 档、12 个值域共用一个前缀，`.vx-tenant-pill--active` 一条规则同时是「租户正常」
「成员在职」「订阅生效」「模型已启用」。按值域拆成 6 张表（新文件
`modules/shared/tenant-tone.ts`）。

**按值域拆表立刻逼出四个缺口**，全是 `Record` 报出来的，肉眼看不到：

1. **成员态 `invited` 没有颜色**——值域三个值，CSS 只画了两个，已邀请未加入的成员
   一直是默认样式。归 `brand`（新来的，等人接手），与账号态的 `invited` 同档。
2. **策略态 `disabled` 没有颜色**——值域四个值，CSS 画了三个。归 `neutral`：
   "关掉了"不是"配错了"，与 `undefined`（没配）的红分开。
3. **租户详情页的订阅态和订阅列表页不是一个值域**：这里是
   `TenantOperationSubscription.status`（trial/active/**past_due**/cancelled），
   那里是 `SubscriptionOperationStatus`（…/**overdue**/…）。同一件"欠费"两个名字。
   这正是 TD #33 的契约漂移——此前两边都往同一个 CSS 前缀里塞，撞不出来。
   本轮只如实建表，改名连 BFF 与 view-model 一起动，仍归 #33。
4. **`past_due` 不是死档**——我先前按"类名全仓 0 引用"判它已死，错了：它由模板拼接
   产生（`--${subscription.status}`），字面量搜不到。判死码必须考虑模板拼接，
   这条 `admin-table-consolidation.md` 已经记过一次，这里又踩。

**另一处自我纠正**：`modules/tenants/tenant-utils.ts` **早就有**
`TENANT_STATUS_TONE` / `VERIFICATION_TONE` / `TENANT_RISK_TONE` 三张表，而且已经在用
`info`（试用=进行中、待审=流程中）。我一度重建了同名表，且此前说"`info` 从来没被
用过"——那只对 `status-tone.ts` 成立，说过头了。重复的已删，调用点改指既有表。

**复测**：className 用法 266 → 40 处，选择器 239 → 50 个，admin CSS 6484 → 5977 行，
`admin-management-pills-directory.css` 清空后删除。剩下的 40 处全是**分类标与等级标**
（`--source` / `--cycle` / `--tier-*` / 权限层 L1–L3 / 产品能力 mode·tag / 角色 api·menu·button），
按定好的规矩它们本就留在 admin。
