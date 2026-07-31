# Design System 重构：三包架构 + Tailwind v4 全面化

日期：2026-07-31 ｜ 范围：`@vxture/design-tokens`、`@vxture/design-ui`、`@vxture/design-system`、Figma `Vxture-Design-System`

## 前提变更（2026-07-31）

业务系统仍在开发期、无生产消费者。据此推翻两条早期决策：

| 原决策      | 现决策                                         | 原依据为何失效                                 |
| ----------- | ---------------------------------------------- | ---------------------------------------------- |
| D2 不做删除 | **允许删除，但必须 codemod 驱动 + 等价性验证** | "已有外部消费者、删除公开入口=major"不再成立   |
| D3 单包     | **拆三包**                                     | "外部消费刚建立，过早拆包成本高"——窗口现在最宽 |

## 决策

| #   | 决策                                                 | 理由                                                       |
| --- | ---------------------------------------------------- | ---------------------------------------------------------- |
| D1  | Token 分层用 **T1–T4**                               | 避开 `060` 已被 lint 强制的 L0–L5 组件归属分层             |
| D2′ | **允许删除，codemod 驱动**                           | CSS 对未定义变量静默失效，手工删除会留下无声的坏引用       |
| D3′ | **三包**：tokens / ui / system                       | 见 `040` §1.1                                              |
| D4  | T3 公开只读，禁止覆写                                | 引用允许，赋值由守卫拦截                                   |
| D5  | 基座 shadcn 惯例 + Radix + cva                       | shadcn 作源码生成器，非分发机制                            |
| D7  | T2 规范名采用 **shadcn 约定**                        | 与 Figma、shadcn 组件三方对齐                              |
| D8  | **命名不带层号**                                     | 三家都靠命名空间而非 `t1/t2` 前缀区分                      |
| D9  | 取值以 **Figma 为准**，preset 仅作结构参考           | preset 是 violet + Tailwind v4 P3 值，与品牌和设计稿都不符 |
| D10 | 中性色全面切 **neutral**                             | 与 Figma、shadcn `baseColor=neutral` 对齐                  |
| D13 | **全面 v4**：T2 全量进 `@theme`，组件用真工具类      | 任意值语法是 v3 思维残留；已实测 `@theme` 支持命名档位     |
| D14 | **单一词汇**，遗留 `--vx-*` 语义名经 codemod 后删除  | 现状两套并行：遗留 1245 处工具类 vs 新 169 处              |
| D15 | 排版角色**只认设计稿那 24 档**，代码里多出的一律分流 | 见下表；孤儿角色从未进过设计系统                           |
| D16 | DS 内**禁用业务与产品专名**，一律用通用组件名        | `console-*` / `admin-*` / `platform-*` 都会绑死到某个产品  |
| D17 | 三个工作台共用一套通用图案，website 自成一路         | 工作台同形，官网是营销站，两者设计目标不同                 |

层级定义见 `060` §1.1，T1/T2 边界与构建规则见 `065`，包结构见 `040`。

### D15 附：8 个孤儿排版角色的分流

Figma 设计稿的排版角色恰为 24 档（display×5 / heading×5 / body×5 / label×5 /
code×2 / caption / overline）。手写 CSS 里另有 8 个名字，**在设计稿中一个都不存在**。
按性质分流，一个都不进 T2：

| 孤儿                                            | 历史取值                                          | 去向                                   |
| ----------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| `display-hero` / `metric-lg` / `brand-subtitle` | `clamp(…, 8vw, …)` 等流体值                       | T3 或断点变体——刻度层不容纳视口函数    |
| `cjk-heading` / `font-display` / `font-number`  | 分别等于 `heading-2` / `font-brand` / `font-sans` | 直接删，零损失                         |
| `cjk-body` 行高字距                             | `1.75` / `0.01em`                                 | 应做成 `:lang(zh)` 模式轴，非新角色    |
| `logo` / `logo-large` 字距                      | `-0.025em` / `-0.04em`                            | 字标组件的修饰，取 T1 `tracking-tight` |

`font-number` 想表达的是等宽数字，那是 `font-variant-numeric: tabular-nums`
一个属性，做成字体族纯属空转。

**CJK 行高字距是 T2 目前唯一真实的缺口**：中文正文需要更大行高与正字距，且该
需求作用于**任何**角色，与暗色 / 密度 / 字号同属模式轴，不应为每个角色复制一套
`cjk-` 变体。待单独设计。

## 已完成（前提变更前）

T1–T3 三层已从 Figma DTCG 导出全量生成，四个生成器 + 断言体系就位：

- **T1** 14 文件全裸值（不引用其他 T1）；排版按子命名空间归入 `foundation/typography/`
- **T2** 13 文件按命名空间分（一个命名空间对应一族工具类）
- **T3** 20 族 192 项，modal 已按治理门槛收敛
- **守卫**：exports 快照、token 同步、取值一致性、z-index 互异、撞名断言
- **对齐 Tailwind**：radius 按取值对齐消除工具类遮蔽；字距改 em；duration/ease 改名；container 改名 `--layout-page-*` 并与断点对齐

设计稿缺陷已回报并部分修复（描述错误 5、codeSyntax 缺前缀 13、撞名 22 组、缺失 198、表面阶梯偏离 4、modal 越界、z-index 同值 2 组）。

## 待办

### A. 拆包

1. 建 `@vxture/design-tokens`：T1/T2/T3 CSS + TS 引用 + zIndex + Density/FontSize 类型。零依赖。
2. 建 `@vxture/design-ui`：组件 74 + icons 5 + hooks 6 + utils 2 + `components-*.css` 13 + `platform-*.css` 70。依赖 tokens。
3. `@vxture/design-system` 瘦身为运行时接线 + 伞包：theme / density / fontSize + 品牌入口 + auth 体验 + shell 模板 + re-export。
4. `ShellChrome.tsx` 的 `Density` 类型改从 tokens 引入——这是唯一阻碍依赖图线性化的点。
5. `lint:boundaries` 加硬门：**ui 禁止 import system**。
6. 伞包对另两包用精确版本。

### B. v4 全面化

1. T2 全量注册 `@theme`，产出真工具类。✅（含 `--font-*` 4 族、`--text-*` 24 档）
2. Button 试点改用工具类，去掉任意值语法。
3. 其余 11 个 Radix 组件按 Button 样板 cva 化。

排版角色走 v4 的 `--text-<role>--<modifier>` 子键机制：一个 `text-body-md`
同时落 font-size / line-height / letter-spacing / font-weight。手写的
`.text-heading-1` / `.font-brand` 与生成的同名工具类互相遮蔽，且不跟随字号
模式轴，已随 `typography.css` 一并删除。

### C. 退役遗留 ✅

原计划是"codemod 迁移后再删"。实测推翻了这个前提：165 个遗留样式文件对
T1/T2/T3 的引用数为 **0**，两层完全不相交，没有可迁移的等价关系——迁移的成本
等于重写，而重写目标本就是 cva 组件。故改为直接删除。

已完成：删 155 个文件（约 12.3k 行）+ 手写排版层 `typography.css`；
三个 barrel 留空壳使 portal 仍可构建；顺带清掉三处重复（shadcn 桥接、
两个品牌色阶副本）。DS 样式层的悬空引用已清零。

### C2. 通用工作台图案（新增）

admin 在 portal 里另起了 148 文件 / 12.8k 行的私有栈，console 则一直吃 DS 的
`platform-*`。**重复发生在 admin ↔ DS 之间，不是 console ↔ admin。**

admin 那 148 个文件按**页面**切分（`management` 50、`overview` 17…），不是按图案，
所以原样抬进 DS 等于把页面级重复升格成包级重复。改为提炼约 12–15 个复现图案，
以 T1–T3 + 工具类重写为 cva 组件：数据表格、工具栏、页头、面板、表单行、
状态胶囊、分页、空态、详情抽屉、step-up 弹窗、标签页。

命名遵循 D16：`DataTable` / `Toolbar` / `PageHeader`，不带任何产品前缀。

### D. 发布体系改造

1. `050` 升 2.0.0：三包有序发布（tokens → ui → system）。
2. `publish-design-system.yml` 改造为三包流水线。
3. exports 快照与 `lint:design*` 按包拆分。

## 未决

| 项                                                   | 说明                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| gap / inset / control-inset-x 三条刻度五档中三档同值 | 是否合并为一条？影响 `@theme` 能否干净注册（`--spacing-*` 是单一命名空间） |
| 排版角色行高吸附刻度（方案 A）                       | 24 角色、最大偏移 4px、平均 1.1px；已确认采纳，待执行                      |
| `layout-semantic` 拆分                               | `field-*`/`panel-*` 是宽度刻度，`sidebar-*`/`topbar-*` 是组件尺寸          |
| T1 栅格断言                                          | T1 改裸值后失去"自动落在 4px 栅格"的保证，需补断言                         |
| `radius/2xl`（20px）                                 | Tailwind 刻度无对应，未发出，待设计侧确认                                  |

## 不做事项

不拆出更多包（icons 被几乎所有组件依赖，单独拆只服务罕见场景）；不并入 `@vxture/shared`；不开放 `src/**` 深层导入；不建 shadcn Registry。
