# Design System 使用规范

版本：1.3.2
日期：2026-06-23
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

Foundation patch 已正式迁入 DS，临时 patch 文件不再保留为源码。`--vx-space-3xl/4xl`、`--vx-radius-xs/2xl/3xl`、`--vx-shadow-xs/xl/2xl/glow/focus-ring/focus-ring-ai`、`--vx-duration-*`、`--vx-ease-*`、`--vx-motion-*` 和 `--animate-vx-*` 由 `tokens-foundation-radius-space.css`、`tokens-foundation-shadow.css`、`tokens-foundation-motion.css` 与 `tokens-foundation-type-layout.css` 分层维护，并通过 `tokens-theme-foundation.css` 映射为 Tailwind `vx-*` 工具能力。

应用端只能消费这些语义 token、Tailwind `vx-*` 映射或 DS 组件封装；不得在应用 CSS 中重新定义阴影、圆角、动效曲线、动画关键帧或发光基线。`--vx-shadow-glow`、`--vx-motion-ai-pop`、`--animate-vx-shimmer` 属于 AI / 生成态视觉语义，只能用于 AI 入口、生成中状态、模型徽章和 DS 授权的 AI 组件组装。

Reduced motion 已在 DS Foundation 层处理，应用端不需要重复写全局 `prefers-reduced-motion` 基线；业务确需动态延迟、坐标或进度时，保留在 L5 Runtime Dynamic，不能借此承载固定设计值。

`packages/design/*.css` 下的迁移 patch 文件只允许作为短期输入。迁入完成后必须删除，正式事实来源只允许是 `packages/design/design-system/src/styles/*`、`packages/design/design-system/src/tokens/*` 和本规范文档。

## 7. 品牌标识组合

DS 提供 `.vx-brand-lockup`、`.vx-brand-mark`、`.vx-brand-name`、`.vx-brand-local-name` 与 `.vx-brand-separator` 五个品牌标识组合类，用于产品名、子品牌和本地化名称的轻量组装。它们只承载品牌字体、间距、颜色和图标尺寸基线，不规定链接、文案或导航行为。

应用端可以组合这些类表达具体品牌上下文，但不得重新定义品牌字体、字号、间距、颜色或图标尺寸。如果现有类无法覆盖新的跨应用品牌结构，应先扩展 DS，再迁移应用调用。

## 8. Motion / Z-index / Breakpoint

Motion 只能消费 DS Foundation token：`--vx-duration-*`、`--vx-ease-*`、`--vx-motion-*` 或 `--animate-vx-*`。业务层不得重新声明固定时长、缓动曲线或全局 keyframes；AI 生成态优先使用 DS AI 组件内建 motion。

Z-index 只能使用 `--vx-z-*` 语义层级。业务层允许 `0-99` 内的局部堆叠值，超过 `99` 的 overlay、drawer、toast、popover、modal 必须使用 `--vx-z-dropdown`、`--vx-z-popover`、`--vx-z-tooltip`、`--vx-z-modal`、`--vx-z-drawer`、`--vx-z-toast` 等 token。

断点使用 Tailwind 语义类或 DS breakpoint token 体系。业务 CSS 不得在 media query 中复制 `640px`、`768px`、`1024px`、`1280px`、`1536px` 标准断点；容器宽度优先使用 `--vx-container-*`，页面栅格使用 `--vx-grid-*`。

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
pnpm --filter @vxture/design-system lint
pnpm --filter @vxture/design-system type-check
pnpm --filter @vxture/design-system build
```

消费者变更还要运行对应应用的 `lint` / `type-check` / `build`。

## 12. 关联文档

- `packages/design/design-system/README.md`
- `docs/packages/design/design-system.md`
- `docs/standards/design-system-release.md`
- `docs/standards/design-system-consumer-trial.md`
- `docs/standards/design-system-package-convergence.md`
- `docs/audit/checklist-ds.md`
