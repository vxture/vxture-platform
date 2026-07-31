# Design System 重构：三包架构 + Tailwind v4 全面化

日期：2026-07-31 ｜ 范围：`@vxture/design-tokens`、`@vxture/design-ui`、`@vxture/design-system`、Figma `Vxture-Design-System`

## 前提变更（2026-07-31）

业务系统仍在开发期、无生产消费者。据此推翻两条早期决策：

| 原决策      | 现决策                                         | 原依据为何失效                                 |
| ----------- | ---------------------------------------------- | ---------------------------------------------- |
| D2 不做删除 | **允许删除，但必须 codemod 驱动 + 等价性验证** | "已有外部消费者、删除公开入口=major"不再成立   |
| D3 单包     | **拆三包**                                     | "外部消费刚建立，过早拆包成本高"——窗口现在最宽 |

## 决策

| #   | 决策                                                | 理由                                                       |
| --- | --------------------------------------------------- | ---------------------------------------------------------- |
| D1  | Token 分层用 **T1–T4**                              | 避开 `060` 已被 lint 强制的 L0–L5 组件归属分层             |
| D2′ | **允许删除，codemod 驱动**                          | CSS 对未定义变量静默失效，手工删除会留下无声的坏引用       |
| D3′ | **三包**：tokens / ui / system                      | 见 `040` §1.1                                              |
| D4  | T3 公开只读，禁止覆写                               | 引用允许，赋值由守卫拦截                                   |
| D5  | 基座 shadcn 惯例 + Radix + cva                      | shadcn 作源码生成器，非分发机制                            |
| D7  | T2 规范名采用 **shadcn 约定**                       | 与 Figma、shadcn 组件三方对齐                              |
| D8  | **命名不带层号**                                    | 三家都靠命名空间而非 `t1/t2` 前缀区分                      |
| D9  | 取值以 **Figma 为准**，preset 仅作结构参考          | preset 是 violet + Tailwind v4 P3 值，与品牌和设计稿都不符 |
| D10 | 中性色全面切 **neutral**                            | 与 Figma、shadcn `baseColor=neutral` 对齐                  |
| D13 | **全面 v4**：T2 全量进 `@theme`，组件用真工具类     | 任意值语法是 v3 思维残留；已实测 `@theme` 支持命名档位     |
| D14 | **单一词汇**，遗留 `--vx-*` 语义名经 codemod 后删除 | 现状两套并行：遗留 1245 处工具类 vs 新 169 处              |

层级定义见 `060` §1.1，T1/T2 边界与构建规则见 `065`，包结构见 `040`。

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

1. T2 全量注册 `@theme`，产出真工具类。
2. Button 试点改用工具类，去掉任意值语法。
3. 其余 11 个 Radix 组件按 Button 样板 cva 化。

### C. codemod 退役遗留

按序执行，每步须有等价性验证：

1. 建映射表：`--vx-color-*` → shadcn 语义名；`bg-vx-*` → `bg-*`。
2. **色相变更单独一步**：`gray-*` → `neutral-*` 是可感知视觉变更，不与改名混在同一次提交。
3. 跑 codemod：24,965 处变量引用（119 CSS 文件）+ 1,245 处工具类。
4. 删除 63 个遗留 `tokens-*.css` 与遗留 `@theme` 桥接。

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
