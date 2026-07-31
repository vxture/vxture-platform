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

**T2 只剩三族**：色彩语义、24 档排版角色、页面与内容宽度。其余刻度
（radius / shadow / ease / duration / opacity / border-width / z-index / spacing / size）
已随 T1 镜像上游一并退役——给上游档位另起一个名字（把 `duration-150` 叫成 `duration-fast`）
不产生语义，只多一处真值。直接用内置工具类：`rounded-lg`、`shadow-md`、`ease-out`、
`duration-150`、`opacity-45`、`border-2`、`z-500`、`p-4`、`size-4`。

**T3 已退役**。组件尺寸改由 cva variant 承担：CSS 变量表达不了"紧凑档整体下移一档"
这类关系（实测密度三档之间是档位平移而非等比缩放，比值 1.0–1.5 不等），而这正是
组件变体的本职。设计稿的组件尺寸留在 `Figma-Token/vx-Component/` 作记录。

**取值约束**：

- 组件里一律用工具类，**禁止任意值语法**（`h-(--control-height-lg)`）。
- 布局常量（侧边栏宽度等一次性视口决策）在产品层定，不入 DS。
- 暗色层级由 surface 明度递增与描边承担，不靠阴影递增。

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

尺度、阴影与缓动**一律用 Tailwind 内置工具类**，DS 不再自持这几族刻度——T1 与上游同值，
另起一套名字只会多一处真值。应用端不得在 CSS 中重新定义阴影、圆角、动效曲线或动画关键帧；
需要新挡位时走 §9 的流程补进 `foundation-policy.mjs` 的扩展表，而不是就地写死。

事实来源只有三处：`packages/design/design-system/src/styles/foundation|semantic/*`（生成物）、
`scripts/design-tokens/foundation-policy.mjs`（偏离登记）与本规范文档。生成物不得手工编辑，
改动会被下一次生成静默覆盖。

## 7. 品牌标识组合

DS 提供 `.vx-brand-lockup`、`.vx-brand-mark`、`.vx-brand-name`、`.vx-brand-local-name` 与 `.vx-brand-separator` 五个品牌标识组合类，用于产品名、子品牌和本地化名称的轻量组装。它们只承载品牌字体、间距、颜色和图标尺寸基线，不规定链接、文案或导航行为。

应用端可以组合这些类表达具体品牌上下文，但不得重新定义品牌字体、字号、间距、颜色或图标尺寸。如果现有类无法覆盖新的跨应用品牌结构，应先扩展 DS，再迁移应用调用。

## 8. Motion / Z-index / Breakpoint

**Motion**：时长取 Tailwind 时长档（`duration-75/100/150/200/300/500/700/1000`），缓动取
`ease-in` / `ease-out` / `ease-in-out`。DS 曾用 Material 三条曲线覆盖这三个名字，已退回上游取值——
覆盖上游同名挡位属"修改"不属"扩展"。业务层不得声明全局 keyframes；AI 生成态优先用 DS AI 组件内建 motion。

**Z-index**：v4 的 z-index 是裸数值工具类，没有具名 token 可引用，但**叠放次序是真实的设计约束**，
故保留为取值阶梯。`0–99` 归局部堆叠自由使用；超过 `99` 必须落在下表上（守卫 `ds/no-hardcoded-z-index` 按此白名单校验）：

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

阶梯依据 Bootstrap / MUI / Ant Design 三家共识。逐档互异是硬要求：同值时叠放次序取决于
DOM 顺序而非设计意图，是静默的层级 bug。

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
