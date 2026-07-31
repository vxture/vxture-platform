# Design System 使用规范

版本：1.4.0
日期：2026-07-31
范围：`portals/*`、`agent-studio/*` 以及通过包发布接入的外部业务前端消费者

Design System 是平台 UI 的规则层、基准层和通用能力层。应用端负责业务语义组装，不负责重新定义基础控件、底层 UI 引擎、设计 token 或通用模式。

## 1. 分层原则

| 层级                 | 归属     | 允许内容                                                                                                      |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| L0 Foundation        | DS       | token、字体、主题、密度、Tailwind `@theme` 映射                                                               |
| L1 Primitive         | DS       | Button/Input/Card/Dialog/Icon 等基础组件                                                                      |
| L2 Platform Pattern  | DS       | DataTable、FilterBar、ActionMenu、Pagination、DialogForm、StatusBadge、MetricCard、通用 shell/page/table 模式 |
| L3 Portal Experience | Portal   | 导航、门户 chrome、工作区体验、产品气质                                                                       |
| L4 Domain Assembly   | 业务模块 | 业务实体页面的语义布局和状态组装                                                                              |
| L5 Runtime Dynamic   | 调用现场 | 坐标、进度、背景图 URL、动画延迟等运行时值                                                                    |

应用可以组装 DS 能力，但不能把组装写成新的基础定义。

### 1.1 Token 取值分层 T1–T4

L0–L5 是**组件归属**分层（谁拥有这段 UI）。Token 取值分层另用 **T1–T4**，两者正交，编号不可混用。

| 层           | 定义                                             | 载体                     | 公开契约     | 应用侧   |
| ------------ | ------------------------------------------------ | ------------------------ | ------------ | -------- |
| T1 Primitive | 原子值，无语义；**Tailwind v4 theme 的完整镜像** | `styles/foundation/`     | 否           | 禁止引用 |
| T2 Semantic  | 意义绑定，引用 T1                                | `styles/semantic/`       | 是（主契约） | 可引用   |
| T3 Component | —（已退役，见下）                                | —                        | —            | —        |
| T4 Page      | 页面/实例样式                                    | 各产品仓库，不在 DS 包内 | 不适用       | —        |

**T1 是镜像，不是差分**。命名空间、分组、挡位、名称、取值与 Tailwind v4 逐项一致，由
`scripts/design-tokens/generate-foundation.mjs` 读上游 `theme.css` 生成，一致性由构造保证。
全部偏离登记在 `scripts/design-tokens/foundation-policy.mjs`，逐条带理由，生成时打印：

- **扩展**（Tailwind 没有的挡位）：`text-3xs/2xs`、`breakpoint-xs/3xl/4xl/5xl`、`font-brand/cjk`
- **覆盖**（Tailwind 有、DS 判定要改）：`font-sans` / `font-mono` 的字体栈
- **减法**：色板只留 neutral / red / amber / emerald / sky / purple 六个色相（完整色阶）加品牌色

**T2 覆盖全部刻度族**，每族都产出真工具类：

| 族              | T2 名 → 工具类                                                                | 命名空间                               | 模式轴       |
| --------------- | ----------------------------------------------------------------------------- | -------------------------------------- | ------------ |
| 色彩            | `--primary` → `bg-primary`                                                    | `--color-*`                            | 明暗         |
| 排版角色        | `--body-md-*` → `text-body-md`                                                | `--text-*`                             | 字号三档     |
| 间距 / 控件高度 | `--space-md` → `p-md`、`h-control-lg`                                         | `--spacing-*`                          | **密度三档** |
| 图标 / 媒体尺寸 | `--spacing-icon-md` → `size-icon-md`                                          | `--spacing-*`                          | 无           |
| 圆角            | `--radius-md` → `rounded-md`                                                  | `--radius-*`                           | 无           |
| 视觉高度        | `--shadow-raised` → `shadow-raised`                                           | `--shadow-*`                           | 无           |
| 叠放次序        | `--z-index-modal` → `z-modal`                                                 | `--z-index-*`                          | 无           |
| 时长 / 缓动     | `--transition-duration-fast` → `duration-fast`、`--ease-enter` → `ease-enter` | `--transition-duration-*` / `--ease-*` | 无           |
| 透明度          | `--opacity-disabled` → `opacity-disabled`                                     | `--opacity-*`                          | 无           |
| 描边宽度        | `--border-width-thin` → `border-thin`                                         | `--border-width-*`                     | 无           |
| 页面 / 内容宽度 | `--container-page-lg` → `max-w-page-lg`                                       | `--container-*`                        | 无           |

**命名空间必须写对**。`--duration-*`、`--z-*`、`--space-*` 都不是 v4 的命名空间（正确的是
`--transition-duration-*`、`--z-index-*`、`--spacing-*`）；写错则变量声明成功、工具类不产出、
**且不报错**。`duration-fast` 曾因此哑火一整轮。`check-utilities.mjs` 逐族取样实测守这条。

**零增益的族也走 T2**。radius 目前就是 T1 的恒等别名。保留它是为分层边界完整——
边界要么处处成立、要么不成立，消费方不该需要记住"这族有语义名、那族没有"。

**三族有模式轴**，在模式选择器下声明、由 `theme.css` 以 `@theme inline` 注册，故模式切换
自动跟随：色彩（`.dark`）、排版角色（`html.vx-font-*`）、间距（`.density-*`）。其余各族在
自己的 semantic 文件里 `@theme` 一处声明即完成注册。

**三族没有 T1 可指**：z-index（叠放次序不是量纲，500 不是某个测量值的第 500 档）、opacity
与 border-width（上游既无 theme 变量也无封闭档位表，接受任意取值）。它们在 T2 落字面量，
这不是分层的例外，是那一维本就没有原子层。容器宽度同样落字面量，原因是**容器查询里
var() 不参与求值**。

**T3 已退役**。组件尺寸改由 cva variant 承担——见 §1.2 的三根轴。

**取值约束**：

- 一律用 T2 语义名产出的工具类。裸数值（`p-4` / `h-9` / `z-500`）**不跟随密度与字号三档**，
  用了就等于把该处排除在用户偏好之外；仅限一次性布局微调，且需知情。
- **禁止任意值语法**（`h-(--control-height-lg)`）。
- 暗色层级由 surface 明度递增与描边承担，不靠阴影递增。

### 1.2 组件尺寸的三根轴

组件的"大小"不是一个轴，是三个，它们**相乘**而非相加：

| 轴                                                         | 谁决定 / 何时 | 作用域                | 载体                      |
| ---------------------------------------------------------- | ------------- | --------------------- | ------------------------- |
| **用户偏好**：字号三档、密度三档                           | 用户，运行时  | 全局，`html` 上一个类 | T2 模式块（变量重定向）   |
| **上下文尺寸**：工具栏 sm、英雄区 lg                       | 设计，放置时  | 单个放置点            | cva `size` variant        |
| **意图与状态**：primary/destructive、hover/active/disabled | 设计，放置时  | 单个实例              | T2 语义色 + cva `variant` |

必须分开的理由很直接：用户把字号调大，不该让工具栏按钮变成 hero 按钮；设计师把某个按钮
设成 lg，也不该波及别处。

两者的相乘是自动的：cva 给出 `h-control-md`（上下文说"中号控件"），`.density-compact`
把 `--space-control-md` 从 2rem 改成 1.75rem（用户说"紧凑"）。**组件不需要知道密度存在**。
这也是密度不做成 cva compound variant 的原因：3 档 × 4 尺寸 = 每个组件 12 组要声明，
而且页面里那些 `<div class="gap-md">` 根本跟不上。

**一致性靠三道，只有第二道是真保证**：

1. **cva 定义合法集合** —— `size` 只有 sm/default/lg，写别的 TS 报错。挡住"发明新尺寸"。
2. **模式组件（L2）固定"哪个上下文用哪档"** —— `Toolbar` 自己渲染控件、或用 context 下发
   `size="sm"`，页面代码没有选择余地。靠人记住"工具栏用 sm"必然漂移。
3. **护栏** —— 禁任意值语法、禁应用层定义 `--vx-*`、禁裸设计值。挡住绕过前两道。

## 2. 合法使用方式

```tsx
import { Button, DataTable, DialogForm, Icon } from "@vxture/design-system";
import "@vxture/design-system/styles/globals.css";
import "@vxture/design-system/styles/brands/vxture.css";

<Button>
  <Icon name="search" size="sm" />
  搜索
</Button>;
```

允许的 DS 子入口只有：

- `@vxture/design-system`
- `@vxture/design-system/tokens`
- `@vxture/design-system/types`
- `@vxture/design-system/server`
- package exports 明确暴露的 `@vxture/design-system/styles/*`

`@vxture/design-system/styles/globals.css` 已聚合品牌标识组合基线。若调用场景只需要品牌标识样式，也可以单独引入 `@vxture/design-system/styles/brand.css`。

品牌样式入口必须显式选择且单应用只能选择一个：

- `@vxture/design-system/styles/brands/vxture.css`
- `@vxture/design-system/styles/brands/ruyin.css`

`vxture` 是平台级品牌，`ruyin` 是产品级品牌。两者当前可以保持同构，但消费项目必须通过各自品牌入口接入，后续品牌独立修改时不需要改应用接入方式。

## 3. 跨仓库消费最小标准

Vxture 组织内其他仓库消费 DS 时，只把 `@vxture/design-system` 视为应用层主依赖。`@vxture/shared` 是 DS 的底层契约依赖，会随 DS 传递安装；只有业务代码直接使用 shared 的类型、常量或工具函数时，才在消费项目中显式声明 `@vxture/shared`。

### 3.1 registry 配置

消费仓库必须把 `@vxture` scope 指向 GitHub Packages。项目级 `.npmrc` 可以提交 registry 和环境变量占位，不得提交真实 token：

```ini
@vxture:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

本地开发者把 `GITHUB_PACKAGES_TOKEN` 配到自己的 shell 环境或用户级 npm 配置中；CI 使用仓库或组织 secret 注入。安装私有 GitHub Packages 至少需要具备读取包权限的 token。若消费仓库已被授予对应 package access，也可以在 GitHub Actions 中改用该仓库的 `GITHUB_TOKEN`。

### 3.2 依赖声明

消费仓库使用已发布版本，不得使用 `workspace:*`：

```bash
pnpm add @vxture/design-system
```

如果业务源码直接导入 `@vxture/shared`，再显式安装：

```bash
pnpm add @vxture/shared
```

`@vxture/design-system` 的 peer dependencies 必须由消费项目提供，至少包括当前 React / Tailwind 栈所需的 `react`、`react-dom`、`next-themes`、`tailwindcss`、`tailwindcss-animate` 和 `@phosphor-icons/react`。已有 Next.js / React 项目通常已经具备其中一部分，缺失项按 peer dependency 提示补齐。

### 3.3 应用入口

每个应用根入口必须引入 DS globals，再选择一个品牌入口：

```tsx
import "@vxture/design-system/styles/globals.css";
import "@vxture/design-system/styles/brands/ruyin.css";
```

平台级应用使用 `brands/vxture.css`；如影产品级应用使用 `brands/ruyin.css`。禁止同时引入两个品牌入口，禁止在应用侧复制品牌 token。

### 3.4 允许和禁止

允许：

- 从 `@vxture/design-system` 导入组件、Icon、Provider、hook 和 `cn`。
- 从 `@vxture/design-system/tokens` 或 `/types` 导入 server-safe token 引用和类型。
- 从 package exports 明确暴露的 `styles/*` 导入稳定 CSS 入口。
- 业务代码确有需要时，从 `@vxture/shared` 导入平台共享类型、常量和纯工具。

禁止：

- 从 `@vxture/design-system/src/**`、`@vxture/shared/src/**` 或任意未导出子路径导入。
- 在消费项目中使用 `workspace:*` 指向 Vxture monorepo 包。
- 在消费项目中定义 `--vx-*` token、复制品牌色或重新实现基础控件。
- 将 GitHub Packages token 写入仓库、日志或 `.env.example` 的真实值中。

### 3.5 CI 接入模板

```yaml
steps:
  - uses: actions/checkout@v6

  - uses: pnpm/action-setup@v6

  - uses: actions/setup-node@v6
    with:
      node-version: "24"
      cache: "pnpm"
      registry-url: "https://npm.pkg.github.com"
      scope: "@vxture"

  - name: Install dependencies
    env:
      GITHUB_PACKAGES_TOKEN: ${{ secrets.VXTURE_PACKAGES_READ_TOKEN }}
    run: pnpm install --frozen-lockfile
```

`VXTURE_PACKAGES_READ_TOKEN` 应作为组织或仓库 secret 管理，权限只给读取 GitHub Packages 所需范围。

### 3.6 接入验收

消费仓库完成接入后至少验证：

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
```

若消费仓库也启用 DS guardrail，应追加同等约束：不得新增 DS 深层导入、应用侧 `--vx-*` token、原生基础控件和硬编码设计值。

## 4. 禁止事项

应用层禁止：

- 从 `@vxture/design-system/src/**` 或未授权子路径导入。
- 直接依赖或导入 `@phosphor-icons/react`、`lucide-react`、`react-icons`、`@radix-ui/*`。
- 手写 `button`、`input`、`select`、`textarea`、`table` 等基础控件。
- 定义 `--vx-*` CSS custom property。
- 新增硬编码颜色、字号、间距、圆角、阴影等设计值。
- 用 inline style 承载设计值。
- 在聚合入口文件里继续写具体规则，例如 `platform.css`、`console.css`、`admin-management.css`。

允许的应用 CSS 只表达业务组装语义，例如布局排列、状态组合、实体信息密度。若某个结构具备跨应用复用价值，先补 DS，再迁移应用调用。

## 5. AI 色彩语义

DS 1.3.0 完整迁入 Quantum AI 色彩层，品牌主色、auth 视觉、shell brand 与 AI 专属语义均统一到 DS token。AI primitive 色阶只属于 DS Foundation 和 DS 内部组装，应用只能消费语义 token，不得直接引用 `--vx-color-ai-500`、`--vx-color-ai-cyan-500`、`--vx-color-spark-400` 或 `bg-vx-ai-500` 这类 primitive 工具类。

| token                  | 用途                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `--vx-color-primary`   | 产品主色：CTA、链接、焦点环、激活导航和品牌 chrome；承担大多数 blue usage           |
| `--vx-color-ai`        | AI 专属 UI：模型徽章、助手 chrome、AI 生成标识、AI 导航入口                         |
| `--vx-color-ai-cyan`   | 仅与 `--vx-color-ai` 成对使用，用于 AI 渐变层次、图谱线条和内发光；不得单独作为主色 |
| `--vx-color-spark`     | 仅用于生成中、完成闪烁、token stream 等短暂动画瞬间                                 |
| `--vx-gradient-aurora` | 品牌级重点视觉：登录视觉面板、营销 hero、Agent 落地页；单屏最多一个                 |

禁止把 `--vx-color-ai` 用作通用 CTA，禁止把 `--vx-color-spark` 用在静态表面。
`pnpm lint:design` 通过 `ds/no-app-ai-primitive-token` 阻止应用侧直接消费 AI primitive 色阶。
如果需要使用 Tailwind 工具类，应用只能使用 `bg-vx-ai`、`bg-vx-ai-soft`、`text-vx-ai-foreground`、`border-vx-ai-border` 等语义映射；`bg-vx-ai-500`、`from-vx-ai-cyan-500`、`text-vx-spark-400` 这类 primitive utility 只允许 DS 内部样式组装。

DS 已在 `@vxture/design-system/tokens` 暴露 `colors.semantic.ai*` 与 `gradients.*` 引用，在 Tailwind `@theme` 暴露 `bg-vx-gradient-aurora`、`bg-vx-gradient-brand`、`bg-vx-gradient-ai-duo`、`bg-vx-gradient-spark-pulse`，并在 `components.css` 提供 `.vx-ai-surface`、`.vx-ai-chip`、`.vx-ai-dot`、`.vx-ai-gradient-text`、`.vx-ai-ambient` 通用类。应用端应该优先组合这些 DS 基准类表达 AI 业务界面；只有实体布局、内容密度、交互状态编排留在应用层。

## 6. Foundation 尺度、阴影与动效

尺度、阴影与缓动一律消费 T2 语义名产出的工具类（`rounded-md` / `shadow-raised` /
`duration-fast` / `ease-enter`），族清单见 §1.1。应用端不得在 CSS 中重新定义阴影、圆角、
动效曲线或动画关键帧。

新挡位分两种情况：**T1 缺档**（上游没有的取值）走 §9 的流程补进 `foundation-policy.mjs`
的扩展表；**T2 缺语义名**（取值有了但没有对应角色）补进 `semantic-policy.mjs`。两者都要
写理由，生成时逐条打印。就地写死一律不接受。

事实来源只有四处：`src/styles/foundation|semantic/*`（生成物）、`foundation-policy.mjs`
（T1 相对上游的偏离）、`semantic-policy.mjs` / `color-policy.mjs` / `typography-policy.mjs`（T2 的全部输入）
与本规范文档。
生成物不得手工编辑，改动会被下一次生成静默覆盖。

## 7. 品牌标识组合

DS 提供 `.vx-brand-lockup`、`.vx-brand-mark`、`.vx-brand-name`、`.vx-brand-local-name` 与 `.vx-brand-separator` 五个品牌标识组合类，用于产品名、子品牌和本地化名称的轻量组装。它们只承载品牌字体、间距、颜色和图标尺寸基线，不规定链接、文案或导航行为。

应用端可以组合这些类表达具体品牌上下文，但不得重新定义品牌字体、字号、间距、颜色或图标尺寸。如果现有类无法覆盖新的跨应用品牌结构，应先扩展 DS，再迁移应用调用。

## 8. Motion / Z-index / Breakpoint

**Motion**：用 T2 语义名——时长 `duration-instant/fast/base/slow/slower`，缓动
`ease-enter`（入场减速）/ `ease-exit`（退场加速）/ `ease-standard`（位置与尺寸变化）。
取值全部落在上游档上：DS 曾用 Material 三条曲线覆盖 `in`/`out`/`in-out`，已退回上游取值——
覆盖上游同名挡位属"修改"不属"扩展"。业务层不得声明全局 keyframes 或字面时长；
AI 生成态优先用 DS AI 组件内建 motion。

**Z-index**：用 `z-base` … `z-max` 语义名。`0–99` 归局部堆叠自由使用；超过 `99` 的一律取自
下表（内联 style 等确实拿不到类名的场合可直写档位值，守卫 `ds/no-hardcoded-z-index`
按此白名单兜底校验）：

| 值   | 用途         | 依据                                                   |
| ---- | ------------ | ------------------------------------------------------ |
| 100  | sticky       | 让位给 portal 化的 dropdown                            |
| 200  | dropdown     | Radix portal 菜单须压过粘性表头，否则被裁切            |
| 300  | overlay      | 浮层遮罩                                               |
| 400  | drawer       | 低于 modal——模态可从抽屉内唤起（抽屉里点删除弹确认框） |
| 500  | modal        |                                                        |
| 600  | popover      | 高于 modal——气泡可用在模态内（模态里的下拉与日期选择） |
| 700  | toast        | 全局反馈，不应被浮层遮挡                               |
| 800  | notification | 常驻更久且可堆叠，压在 toast 之上                      |
| 900  | tooltip      | 必须最高，否则被它所描述的元素遮挡                     |
| 9999 | max          | 逃生档，新增使用需在 PR 说明                           |

阶梯依据 Bootstrap / MUI / Ant Design 三家共识，权威表在 `scripts/design-tokens/semantic-policy.mjs`。
逐档互异是硬要求：同值时叠放次序取决于 DOM 顺序而非设计意图，是静默的层级 bug。

**视觉高度（elevation）另有一条阶梯**，`shadow-flat` / `raised` / `sticky` / `overlay` /
`dialog` / `notification`。它与叠放次序**相关但不可互相推导**：tooltip 叠放最高，阴影却应当
很轻——它小而短暂，重阴影只显笨重（Material 同样给 tooltip 极低 elevation）。两条阶梯的档数
也不同：z-index 要求逐档互异，elevation 允许多角色共用一档，因为可辨识的视觉高度本就比
叠放层级少。

**断点**：用 Tailwind 变体（`sm:` … `2xl:`）与 DS 扩展档（`xs:` / `3xl:` / `4xl:` / `5xl:`）。
业务 CSS 不得在 media query 中复制 `640px`、`768px`、`1024px`、`1280px`、`1536px`；
页面与内容宽度用 `max-w-page-*` / `max-w-content-*`。

暗色模式由 DS token 在 `.dark` / `:root.dark` 下重映射。业务源码不得定义新的 `.dark {}` 块，也不得为暗色主题复制颜色、阴影和边框值。

## 9. DS 不足时的处理

1. 确认 DS 没有对应 primitive、pattern 或 token。
2. 在 `packages/design/design-system/` 中补齐能力。
3. 从公共入口导出，必要时同步 style entry 和 guardrail 白名单。
4. 应用端改为消费 DS 能力。
5. 运行 `pnpm lint:design` 和受影响 package 的 `lint` / `type-check` / `build`。

禁止在应用端先临时实现，再计划以后回收。

## 10. AI 行为约束

AI 修改前端代码时必须：

- 优先从 `@vxture/design-system` 选择组件、Icon、token 和样式入口。
- 遇到 DS 不足时先补 DS 或明确记录缺口。
- 保持业务 class 为组装语义，不把基础控件、颜色、尺度写回应用层。
- 运行或记录对应验收命令。

## 11. 守卫命令

```bash
pnpm lint:design
pnpm lint:design-exports
pnpm --filter @vxture/design-system lint
pnpm --filter @vxture/design-system type-check
pnpm --filter @vxture/design-system build
```

`lint:design-exports` 守卫 DS 公开入口（exports 子路径 + 具名导出 + files + peerDependencies）。入口变化必须先按 `050-design-system-release.md` 判定 SemVer，再用 `--update` 显式更新快照。

消费者变更还要运行对应应用的 `lint` / `type-check` / `build`。

## 12. 关联文档

- `packages/design/design-system/README.md`
- `docs/40-implementation/packages/design/design-system.md`
- `docs/10-standards/design-system-release.md`
- `docs/10-standards/design-system-consumer-trial.md`
- `docs/10-standards/design-system-package-convergence.md`
- `docs/60-operations/audit/checklist-ds.md`
