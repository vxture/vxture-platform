# Design System T1–T4 Token 重构与组件基座迁移

日期：2026-07-31 ｜ 范围：`@vxture/design-system`、Figma `Vxture-Design-System`（`Fxrb8llzofI9MuNqQvTSEJ`）

本工作线是 `040-design-system-package-convergence.md`（阶段 A–E，基本未执行）与 Figma V1.0 token 体系的合并推进，全程受 `050-design-system-release.md` 的 SemVer 契约约束。

## 决策

| #   | 决策                                                             | 理由                                                                                                                                 |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Token 分层用 **T1–T4**                                           | 避开 `060` 中已被 `lint:design` 强制的 L0–L5 组件归属分层，两者正交                                                                  |
| D2  | **不做删除**，纯增量                                             | 已有外部消费者；删除公开入口 = major                                                                                                 |
| D3  | 分发仅 **npm Package**，不建 Registry                            | Registry 的 copy-in 必然漂移，违背"改一个颜色全产品生效"                                                                             |
| D4  | **T3 公开只读，禁止覆写**                                        | 引用 `var(--vx-t3-*)` 允许，赋值由 guardrail 拦截                                                                                    |
| D5  | 基座 **shadcn 惯例 + Radix + cva**                               | shadcn 作源码生成器，非分发机制                                                                                                      |
| D6  | Phase 4 试点 **Button**                                          | 双轨打架最严重                                                                                                                       |
| D7  | T2 规范名采用 **shadcn 约定**                                    | `--background`/`--primary`/`--border`/`--radius` 等；与 Figma、shadcn 组件、preset 三方对齐，Phase 4 零桥接。`--vx-*` 全部保留为别名 |
| D8  | **命名不带层号**                                                 | shadcn/Tailwind/Figma 三家都靠命名空间而非 `t1/t2` 前缀区分层级；T1–T4 只作文档与守卫的概念                                          |
| D9  | 取值以 **Figma brand 为准**，preset 仅作结构参考                 | preset `--primary` 是 violet，Vxture 品牌是 #1e51ff（蓝）；套用 preset 取值会把平台刷成紫色并把 chart 语义模型降级为单色阶           |
| D10 | 中性色**全面切到 neutral**                                       | 与 Figma、shadcn `baseColor=neutral` 对齐；现有 gray 带蓝调，色相不同，属可感知视觉变更                                              |
| D11 | 缺口补齐顺序：**Figma 框架优先，Figma 也缺的由我参考补齐并汇报** | 枚举有上限，Figma 本身亦非全覆盖                                                                                                     |
| D12 | **T1 必须自身完整**，不依赖既有 primitives 兜底                  | 旧资源将陆续退役删除，底层须先夯实                                                                                                   |

**⚠ T1 不得使用 Tailwind v4 内置调色板**：v4 已迁 P3 广色域，饱和色与设计稿不等值（实测 red-600 `#dc2626`→`#e7000b`、emerald-600 `#059669`→`#009966`、purple-600 `#9333ea`→`#9810fa`、amber-500 `#f59e0b`→`#fe9a00`、sky-600 `#0284c7`→`#0084d1`）。中性色两者等值。shadcn 生成的 theme 用的是 v4 值，按 D9 一律以 Figma 为准。

层级定义与取值约束见 `060-design-system.md` §1.1（已落地）。

## 现状结论

- T1 存在但 primitives/brand-vxture/brand-ruyin 三份文件逐字节重复。
- T2 混入裸 hex 与裸渐变；shell token 混入组件尺寸。
- T3 形同虚设，约 70% 是脱离刻度的裸值（`--vx-button-radius: 10px` 不在 L1 刻度上）——属**伪 T3**，按门槛应收敛为 T2 别名。
- 暗色模式无 T1，用平行裸值表。
- Button 受 Tailwind 工具类与 `.vx-btn` CSS-var 两套机制同时约束。
- T4 纪律已破：4 处 portal 文件直接引用 T1。
- 基座为 Radix 手工样式化，`cva` 全仓零依赖零用法。
- 组件缺口：Figma 129 vs 代码 52，其中仅约 17 个被按名消费。

### T1 取值模型（Phase 1 探测结论）

Figma 的原子层**就是 Tailwind 调色板本身**（`color/neutral/*`、`color/emerald/*`），语义映射发生在 L2（`intent/success/fill → color/emerald/700`，并附 WCAG 实测依据：emerald-600 配白字仅 3.77 不达标，故用 700）。

代码现有"原子"绝大多数同样只是 Tailwind 调色板的别名：

| 代码别名                | 实际调色板    | 备注                                |
| ----------------------- | ------------- | ----------------------------------- |
| `success-*`             | emerald       | 与 Figma 一致                       |
| `warning-*` / `spark-*` | amber / amber | **重复两份**                        |
| `danger-*` / `error-*`  | rose / red    | **两套并存**                        |
| `info-*`                | sky           |                                     |
| `ai-*` / `ai-cyan-*`    | purple / cyan |                                     |
| `gray-*`                | gray          | **与 Figma/shadcn 的 neutral 分歧** |
| `brand-*`               | 无            | **唯一真正自定义**，#1e51ff 家族    |

推论：T1 只需自建 brand 一族，其余直接用 Tailwind 内置；hue→intent 的映射交给 T2，与 Figma 同构。

### 需汇报的取值分歧（D11 要求）

| 项                      | 现状                                           | Figma / 权威值                          | 影响                                           |
| ----------------------- | ---------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| 中性色                  | `gray-*`（带蓝调，#6b7280）                    | `neutral-*`（纯中性，#737373）          | 全平台文字/边框/表面可感知变化（D10 已定切换） |
| `--vx-color-orange-400` | `#ff7a45`（**非 Tailwind**，疑 Ant Design 橙） | orange-400 `#fb923c`                    | chart categorical/2                            |
| `--vx-color-lime-500`   | `#1aad19`（**非 Tailwind**，疑微信绿）         | lime-400 `#a3e635` / lime-600 `#65a30d` | chart categorical/5                            |
| `danger-*`              | rose 色阶                                      | Figma 无 rose，danger 用 **red**        | 危险态色相改变                                 |
| `spark-*`               | amber（与 warning 完全重复）                   | Figma 无 spark                          | AI 生成态视觉                                  |
| 饱和色 950 阶           | 缺失（代码只到 900）                           | 已从 Tailwind v3 补齐                   | 暗色模式 muted 底色需要                        |

T1 色相清单（承 Figma）：neutral、brand、emerald、amber、red、sky、purple、orange、teal、cyan、fuchsia、lime、base/white。**不含 rose**——Figma 未使用。

### ⚠ Figma 文档自身的错误（以实测解析值为准）

反查组件节点实测发现三处描述与实际绑定不符，**Phase 2 必须按实测值实现，不能照抄描述**：

| 项                    | 描述所写    | 实测解析                                                                   | 佐证                                                                                |
| --------------------- | ----------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `intent/*/muted` 阶梯 | `<hue>/100` | 全部落在 **`<hue>/50`**（#fef2f2 / #ecfdf5 / #fffbeb / #f0f9ff / #faf5ff） | `on-muted` 自己的描述写的是"muted 阶梯为 50/100/200"，与 muted token 的描述自相矛盾 |
| `content/disabled`    | neutral/400 | **neutral-300** `#d4d4d4`                                                  | 同方向 off-by-one                                                                   |
| `stroke/control`      | neutral/500 | **neutral-400** `#a3a3a3`                                                  | 同方向 off-by-one                                                                   |

结论：muted / muted-hover / muted-active 的正确阶梯是 **50 / 100 / 200**。

另注：`--foreground` 解析为 `#525252`(neutral-600)，但 `content/primary` 描述为 neutral/900 —— 二者并非同一 token，**不可用 `--foreground` 锚定 neutral/900**。

### T1 取值来源与覆盖缺口

96 个 token / 13 色相。标注：`[F]` Figma 实测 · `[T]` Tailwind v3 · `[C]` 沿用既有代码。

- **实测确认 29 项**，且每一项都在 2–5 个独立节点上取得同一值，无冲突。
- chromatic 色阶凡可验证者**全部精确落在 Tailwind v3 原值**上，故未实测步阶按 v3 补齐可信度高，但**未经实测**。
- `brand/main` 是唯一例外（自定义色相，无法由调色板推导），未实测步阶沿用既有代码。
- **orange / teal / fuchsia / lime / cyan 零实测**——Figma 无图表组件。

Figma 侧无法进一步实测的三个硬阻塞：①组件库只有 `default/disabled/selected/external/visited` 变体，**无 hover/active**，而 200/300、700/800、500 阶只经由这些状态可达；②`A08 · Data Display` 无任何图表组件；③文档只有 3 个页面，**无色板页**。补齐需设计侧补 hover 变体或色板页，或改读 Dark 模式（可得 300/400/500/900/950 配对阶）。

另需复核：`--surface-1` 解析为 `#dbe3ff`（蓝调），提示该次读取处于品牌主题模式而非中性默认；chromatic 值不受影响（fill 双模式同值），但 neutral surface 读数在 Phase 2 复用前需抽检。

## 阶段

| Phase | 内容                                                                                             | 版本        | 状态       |
| ----- | ------------------------------------------------------------------------------------------------ | ----------- | ---------- |
| **0** | 契约与术语：T1–T4 写入 060；**exports 快照守卫**（040 阶段A 遗留项）                             | 不发版      | **已完成** |
| 1     | T1 原子层：从 Figma 导出权威值建 `foundation/`；三份重复文件改为引用新 T1（保留不删）            | patch       | 待办       |
| 2     | T2 清洗：裸值改引用 T1；暗色改为对 T1 的独立映射；shell 尺寸按归属迁出                           | patch       | 待办       |
| 3     | T3 建层：按门槛只建必要 T3，伪 T3 收敛为 T2 别名；新增 `src/tokens/component.ts` 并入 exports    | minor       | 待办       |
| 4     | Button 试点：仓外沙盒验证 `shadcn init --base radix` → 消除双轨，cva 为唯一真源 → 并行新入口导出 | minor       | 待办       |
| 5     | 守卫扩面：拦 T1 越层、拦 T3 赋值；4 处存量入 baseline；smoke 补 Tailwind 类生效验证              | patch       | 待办       |
| 6+    | 逐组件迁移 + 040 阶段 B/C 目录收敛 + 组件缺口收敛                                                | patch/minor | 待办       |

**全程不出现 major** 是本路线的核心设计目标。

### Phase 0 交付物（已完成）

- `060-design-system.md` §1.1 T1–T4 分层、T3 门槛、取值约束、覆写禁令（版本 1.4.0）。
- `scripts/guardrails/check-design-system-exports.mjs` + `design-system-exports.snapshot.json`：守卫 exports 子路径、具名导出、`files`、`peerDependencies`。当前基线 15 个子路径 / 根入口 173 个具名导出。
- 接线：`pnpm lint:design-exports`；`ci.yml` 常规校验；`publish-design-system.yml` 构建后 `--strict`。

### Phase 4 关键约束

- `--template next` 不适用（DS 是 tsup 库）；CLI 已确认本仓识别为 monorepo 根且候选工作区不含 DS 包，故先走仓外沙盒。
- cva `variants` 只允许 `vx-` 前缀工具类，禁止裸用 Tailwind 原生刻度（`h-10`/`px-4`/`rounded-md`）。
- 实质任务 = 验证"取消伪 T3、直接绑 T2"规则在代码里走得通。

## 不做事项

不建 Registry；不拆更多发布包；不并入 `@vxture/shared`；不开放 `src/**` 深层导入；不动 Phosphor 图标体系；不在未授权消费仓库提交接入改动。

## 待办

| 项                                                       | 状态                     |
| -------------------------------------------------------- | ------------------------ |
| Figma → 代码 token 同步机制（codegen 还是手工+定期核对） | **未决，影响 Phase 1**   |
| shadcn CLI 对 tsup 库的支持                              | 未实测，Phase 4 沙盒先行 |
| `styles/console-base.css` 被消费但不在 exports map       | 待定性                   |
| Figma 文件误挂载 `Tudou Design System Dark (beta0.1)` 库 | 待清理（不阻塞）         |
| 类型导出无法被运行时快照守卫覆盖（`./types` 运行时为 0） | 已知限制                 |
