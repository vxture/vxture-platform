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
| **3** | 页面骨架换 `ListPageTemplate`/`DetailPageTemplate` | 未开始                                                                                 |
| **4** | pill 色调族 → `Badge`                              | 未开始；拍板②已由 shared 既有文件回答                                                  |
| **5** | B3/B4（卡片选中态、卡表同源）                      | 未评估                                                                                 |
| **6** | 登录态视觉走查                                     | 未开始                                                                                 |

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
