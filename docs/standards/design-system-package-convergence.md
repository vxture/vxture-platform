# Design System 包结构收敛规划

版本：1.0.0
日期：2026-05-30
范围：`@vxture/design-system`、`@vxture/shared`、DS 样式入口与跨仓库消费契约

本文定义 DS 包结构后续收敛方向。当前目标不是拆出更多发布包，而是在保持消费端简单接入的前提下，把 DS 内部结构、公开入口、品牌入口和 shared 依赖关系收敛为可长期演进的形态。

## 1. 当前判断

上层应用的默认消费关系保持不变：

| 包                      | 定位                                                                       | 上层应用使用方式                                         |
| ----------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `@vxture/design-system` | 唯一应用侧 DS 主包，承载组件、图标、主题、token、品牌样式和稳定 style pack | 应用默认显式依赖                                         |
| `@vxture/shared`        | 跨层类型、常量、纯工具和错误基类，不承载 UI 语义                           | 由 DS 传递安装；业务代码直接使用 shared API 时才显式依赖 |

不建议当前拆出 `@vxture/tokens`、`@vxture/ui`、`@vxture/brand-ruyin` 等更多包。理由：

- 当前外部消费刚建立，过早拆包会增加安装、版本联动和权限配置成本。
- 品牌分离仍可以在单一 DS 包内通过公开品牌入口完成。
- shared 的职责不是 DS 子包，而是全仓库底层契约；强行并入 DS 会破坏 shared 层可被非前端模块复用的价值。

## 2. 当前结构风险

`@vxture/design-system` 已经具备清晰 public exports，但内部样式文件仍集中在 `src/styles/` 一层。当前统计：

| 类别           | 数量 | 风险                                                                     |
| -------------- | ---: | ------------------------------------------------------------------------ |
| `tokens-*`     |   57 | token 维度多，后续需要更清晰地区分 foundation、semantic、product alias   |
| `platform-*`   |   68 | platform pattern 与具体管理页面绑定混在一起，容易把业务结构长期沉淀到 DS |
| `console-*`    |   14 | Console style pack 已存在，需要确认哪些是跨产品模式，哪些是产品体验      |
| `components-*` |   11 | 组件样式较稳定，适合作为 L1/L2 样式基础                                  |
| `auth-*`       |    8 | Auth 体验目前可作为 DS experience pack，但需要继续保持可复用边界         |
| 入口或其他     |   11 | `globals.css`、`tokens.css`、`components.css` 等 public shim 必须稳定    |

主要风险：

- 内部文件名已经承担了事实分层，但目录层级没有表达 ownership。
- `platform-*` 文件数量较高，后续新增时容易把单一页面的业务布局写入 DS。
- 公开 CSS 入口与内部 CSS 模块在同一目录，容易让维护者误以为任意 `src/styles/*` 都可被消费端导入。
- `client.ts` 当前未作为 package exports 暴露，主入口 `.` 已经是客户端入口；后续不应随意新增重复入口。

## 3. 目标结构

保持发布包数量不变，收敛 DS 内部目录：

```text
packages/design/design-system/src/
  styles/
    globals.css              # public shim，保持路径稳定
    tokens.css               # public shim，保持路径稳定
    components.css           # public shim，保持路径稳定
    console.css              # public shim，保持路径稳定
    auth.css                 # public shim，保持路径稳定
    fullscreen.css           # public shim，保持路径稳定
    typography.css           # public shim，保持路径稳定
    brands/
      vxture.css             # public brand entry
      ruyin.css              # public brand entry
    foundation/              # token 基线、排版、spacing、radius、shadow、motion
    semantic/                # 语义 token 与 Tailwind bridge
    components/              # L1 primitive 与通用组件样式
    patterns/
      platform/              # L2 platform pattern
      fullscreen/            # L2 fullscreen pattern
    experiences/
      auth/                  # 可复用认证体验
      console/               # 可复用 console shell 体验
    products/
      vxture/                # 平台品牌或产品特有 alias，谨慎使用
      ruyin/                 # 如影产品特有 alias，谨慎使用
```

关键约束：

- public shim 路径保持不变，外部应用继续只导入 `@vxture/design-system/styles/*` 中已公开的入口。
- 内部目录只由 public shim 聚合，不作为 package exports 暴露。
- 迁移时先移动内部模块，再保持 shim import 列表等价，避免消费者感知路径变化。
- 新增品牌入口、删除入口或改名必须按 SemVer 与发布规范执行。

## 4. 收敛阶段

### 阶段 A：契约锁定

目标：先锁住公开入口，再做内部移动。

- 增加 package exports 快照检查，确保公开 JS/CSS 子路径变化需要显式评审。
- 把临时消费端 smoke 验证沉淀为可重复脚本或 workflow job。
- 明确 `@vxture/design-system` 的 public paths 只包括 `.`、`/tokens`、`/types`、`/server` 和已列入 exports 的 `styles/*`。
- 明确 `@vxture/shared` 不作为 UI 包，不新增 React、CSS 或浏览器组件依赖。

验收：

```bash
pnpm lint:design
pnpm --filter @vxture/design-system type-check
pnpm --filter @vxture/design-system build
```

### 阶段 B：样式目录收敛

目标：把 `src/styles/` 一层文件按 owner 分组。

- `tokens-foundation-*` 迁移到 `styles/foundation/`。
- `tokens-colors-*`、`tokens-theme-*`、`tokens-gradients.css` 按职责迁移到 `styles/semantic/` 或 `styles/foundation/`。
- `components-*` 迁移到 `styles/components/`。
- `platform-*` 迁移到 `styles/patterns/platform/`，同时标记疑似业务绑定文件。
- `console-*` 迁移到 `styles/experiences/console/`。
- `auth-*` 迁移到 `styles/experiences/auth/`。

迁移必须分批进行，每批只移动一个 owner 族，保持 public shim 入口不变。

### 阶段 C：业务绑定清理

目标：避免 DS 变成页面 CSS 仓库。

判断规则：

- 能被两个以上产品或页面复用的结构，保留在 DS pattern / experience。
- 只描述单一业务实体页面的布局，迁回对应应用层或改造成更通用的 DS pattern。
- 只改变品牌语义的 token，进入 `brands/` 或 `products/{brand}/`。
- 只为临时页面交付服务的 patch，不进入 DS public shim。

涉及文件移动或删除前必须单独提交方案并确认。

### 阶段 D：JS 入口治理

目标：减少入口歧义，保护 Server Component 场景。

- 保持 `@vxture/design-system` 为客户端主入口。
- 保持 `@vxture/design-system/tokens`、`/types`、`/server` 为 server-safe 入口。
- 暂不新增 `@vxture/design-system/client`，除非出现跨仓库真实需求。
- 组件、hooks、theme 继续只通过根入口导出，不开放深层组件路径。
- shared 能力继续从 `@vxture/shared` 维护；DS 只消费必要的类型、常量和纯工具。

### 阶段 E：发布与试点

目标：每次结构收敛都可被外部消费验证。

- 内部目录迁移且 public exports 不变：按 patch 处理。
- 新增公开入口：按 minor 处理。
- 删除或重命名公开入口：按 major 处理。
- 每次真实发布前执行现有 `publish-design-system` workflow dry run；该流程在总体 CI/CD 规划中归属 `publish-*` 包发布能力。
- 发布后执行跨仓库消费 smoke，并选择真实前端仓库试点。

## 5. 不做事项

- 不把 `@vxture/shared` 合并进 `@vxture/design-system`。
- 不为每个品牌单独发布一个包。
- 不开放 `@vxture/design-system/src/**` 深层导入。
- 不在未授权消费仓库中直接提交接入改动。
- 不通过本地 `pnpm publish` 绕过 workflow。

## 6. 下一步建议

优先级建议：

1. 增加 package exports 快照检查，防止 public API 误改。
2. 把跨仓库消费 smoke 做成脚本或 workflow 的 dry-run 后置验证。
3. 先迁移 `components-*` 和 `auth-*` 两组低风险 CSS，再评估 `platform-*`。
4. 对 `platform-*` 建立 owner 清单，区分 pattern、experience、product alias、业务绑定。

## 7. 关联文档

- `docs/standards/design-system.md`
- `docs/standards/design-system-release.md`
- `docs/standards/design-system-consumer-trial.md`
- `docs/packages/design/design-system.md`
- `packages/design/design-system/README.md`
