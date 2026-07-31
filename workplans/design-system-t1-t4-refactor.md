# Design System T1–T4 Token 重构与组件基座迁移

日期：2026-07-31 ｜ 范围：`@vxture/design-system`、Figma `Vxture-Design-System`（`Fxrb8llzofI9MuNqQvTSEJ`）

本工作线是 `040-design-system-package-convergence.md`（阶段 A–E，基本未执行）与 Figma V1.0 token 体系的合并推进，全程受 `050-design-system-release.md` 的 SemVer 契约约束。

## 决策

| #   | 决策                                  | 理由                                                                |
| --- | ------------------------------------- | ------------------------------------------------------------------- |
| D1  | Token 分层用 **T1–T4**                | 避开 `060` 中已被 `lint:design` 强制的 L0–L5 组件归属分层，两者正交 |
| D2  | **不做删除**，纯增量                  | 已有外部消费者；删除公开入口 = major                                |
| D3  | 分发仅 **npm Package**，不建 Registry | Registry 的 copy-in 必然漂移，违背"改一个颜色全产品生效"            |
| D4  | **T3 公开只读，禁止覆写**             | 引用 `var(--vx-t3-*)` 允许，赋值由 guardrail 拦截                   |
| D5  | 基座 **shadcn 惯例 + Radix + cva**    | shadcn 作源码生成器，非分发机制                                     |
| D6  | Phase 4 试点 **Button**               | 双轨打架最严重                                                      |

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
