# Design Token 构建规范

版本：1.0.0
日期：2026-07-31
范围：`@vxture/design-system` 的 T1–T3 token、Figma DTCG 导出、`scripts/design-tokens/*` 生成器

本文定义 token 从设计到代码的**唯一构建路径**与权威边界。层级定义见 `060-design-system.md` §1.1，发布影响见 `050-design-system-release.md`。

## 1. 权威边界

| 角色                              | 定位                                         | 是否权威         |
| --------------------------------- | -------------------------------------------- | ---------------- |
| Figma 文件                        | **设计与展示**：视觉推演、组件排布、设计评审 | 否               |
| Figma DTCG 导出（`Figma-Token/`） | **工程真值源**：入仓、可 diff、可回溯        | **是**           |
| 生成的 CSS / TS                   | 导出的确定性投影                             | 否（可随时重建） |
| 手写 token                        | ——                                           | **禁止**         |

Figma 里的值只有**导出并入仓之后**才成为工程真值。未导出的改动不存在。

**单向**：Figma → 导出 → 生成物 → 消费。生成物不回写 Figma，代码侧不反向定义 token。

## 2. 管线

```
Figma variables
  ↓ 手动导出（DTCG JSON）
packages/design/design-system/Figma-Token/<collection>/*.tokens.json   ← 真值源，入仓
  ↓ scripts/design-tokens/*.mjs
packages/design/design-system/src/styles/foundation|semantic|components/*.css
  ↓ tokens.css 聚合
消费方（T4 / 产品仓库）
```

### 2.1 导出约定

- 导出**全部集合**，不做裁剪——裁剪会让"缺失"与"未导出"无法区分。
- 目录结构保持 Figma 集合原样：`<collection>/<mode>.tokens.json`。
- 导出文件**逐字入仓，禁止格式化**（已加入 `.prettierignore`）。格式化会破坏与下次重新导出的可比性。
- 导出目录不参与 DS 守卫扫描（`check-design-system.mjs` 的 `IGNORED_PARTS`），因为裸值正是它的本体。
- 不随包发布：`package.json` 的 `files` 白名单未含 `Figma-Token/`。

### 2.2 生成物约定

- 生成物**头部必须标注"由脚本生成，勿手工编辑"**并写明源文件与生成命令。
- 生成器必须提供 `--check`：只校验不写入，用于 CI。
- 每个生成器对应一个 `lint:design-*` 脚本并接入 `ci.yml`。

## 3. 取值规则

### 3.1 `$description` 不可信，`aliasData` 才是真值

导出中每个 token 携带 `$extensions`：

| 字段                                     | 含义                        | 可信度                 |
| ---------------------------------------- | --------------------------- | ---------------------- |
| `com.figma.aliasData.targetVariableName` | 该 token 实际指向的目标变量 | **权威**               |
| `com.figma.codeSyntax.WEB`               | 该 token 的 CSS 变量名      | **权威**               |
| `$value`                                 | 解析后的最终值              | 权威                   |
| `$description`                           | 人工填写的说明              | **仅供参考，已知有错** |

已确认的描述错误（截至 2026-07-31）：

| token              | 描述所写           | 实际（aliasData / 解析值）       |
| ------------------ | ------------------ | -------------------------------- |
| `surface/B-1`      | `color/neutral/50` | `color/brand/main/50`（#eef2ff） |
| `intent/*/muted`   | `<hue>/100`        | `<hue>/50`                       |
| `content/disabled` | `neutral/400`      | `neutral-300`                    |
| `stroke/control`   | `neutral/500`      | `neutral-400`                    |

**生成器一律读 `aliasData` 与 `$value`，禁止解析 `$description`。** 描述错误应回报设计侧修正，但不阻塞生成。

### 3.2 命名映射

Figma 路径 → CSS 变量名，规则确定且不可自由发挥：

| 层       | 变量名来源              | 示例                                                             |
| -------- | ----------------------- | ---------------------------------------------------------------- |
| T1 原子  | 由 Figma 路径机械推导   | `color/brand/main/600` → `--vx-color-brand-600`                  |
| T1 alpha | 同上加后缀              | `color/neutral/600/alpha-08` → `--vx-color-neutral-600-alpha-08` |
| T2 语义  | **取 `codeSyntax.WEB`** | `surface/B-1` → `--background`                                   |
| T3 组件  | **取 `codeSyntax.WEB`** | `toast/shadow-color` → `--toast-shadow-color`                    |

T2/T3 采用 shadcn 约定名（`--background`/`--primary`/`--border`…），shadcn 无对应概念的沿用 Figma 自有名（`--gap-*`/`--inset-*`/`--content-*`）。既有 `--vx-*` 名一律保留为别名，不删除。

### 3.3 禁止使用 Tailwind 内置调色板作为 T1

Tailwind v4 调色板已迁 P3 广色域，饱和色与设计稿不等值：

|             | 设计稿    | Tailwind v4 |
| ----------- | --------- | ----------- |
| red-600     | `#dc2626` | `#e7000b`   |
| emerald-600 | `#059669` | `#009966`   |
| purple-600  | `#9333ea` | `#9810fa`   |
| amber-500   | `#f59e0b` | `#fe9a00`   |

中性色两者等值，但仍须显式声明以保持单一取值来源。shadcn 生成的 theme 用的是 v4 值，**不作为取值来源**。

## 4. 已知导出缺陷与必须的补偿

### 4.1 步阶降级丢值

某步阶一旦挂了 alpha 子项（如 `color/emerald/600/alpha-08`），DTCG 导出会把该步阶降级为「组」，**其不透明本体值不再作为独立 token 导出**。当前影响 13 个色相的 600 阶与 neutral / brand 的 950 阶，共 14 项。

补偿方式：从任一 alpha 子项的 `hex` 字段回收本体值。**回收必须带三条断言，缺一不可**：

1. 同一步阶下所有 alpha 子项 `hex` 必须一致——不一致则本体值无从判定，报错退出。
2. 回收出的本体必须被某个 L2/L3 token 的 `aliasData` 引用——无引用即说明该步阶在 Figma 中并无不透明本体，**拒绝凭空生成**。
3. 凡被 L2/L3 引用的原子，生成物必须覆盖——否则报错退出。

无断言的回收等同于静默猜测，一旦导出结构变化就会产出错误取值而无人察觉。

### 4.2 MCP 页面列表不全

Figma MCP 的页面枚举会漏列页面，且 `search_design_system` 只返回已发布的库变量——**原子层通常未发布，因而完全不可见**。

因此：**取值一律走导出文件，不走 MCP**。MCP 仅用于设计评审、截图、结构探查。

## 5. 同步流程

1. 设计侧在 Figma 改动 variables。
2. 导出全部集合，覆盖 `Figma-Token/`。
3. 运行生成器（不带 `--check`）。
4. **审阅两处 diff**：导出文件的 diff 说明设计改了什么；生成物的 diff 说明工程受什么影响。
5. 按 `050-design-system-release.md` 判定 SemVer——token 值变化属行为变更，即使公开入口未变。
6. PR 合入，CI 的 `lint:design-tokens` 保证二者不漂移。

禁止只改生成物不改导出，也禁止只更新导出不重新生成——CI 会拦截，但更重要的是这会让真值源失效。

## 6. 守卫

| 命令                       | 作用                                   |
| -------------------------- | -------------------------------------- |
| `pnpm lint:design-tokens`  | 生成物与导出一致性 + 第 4.1 节三条断言 |
| `pnpm lint:design-exports` | DS 公开入口快照                        |
| `pnpm lint:design`         | DS 分层与裸值守卫                      |

三者均已接入 `ci.yml`。

## 7. 关联文档

- `docs/10-standards/060-design-system.md` §1.1 —— T1–T4 层级定义
- `docs/10-standards/050-design-system-release.md` —— 发布与 SemVer
- `docs/10-standards/040-design-system-package-convergence.md` —— 目录结构目标
- `workplans/design-system-t1-t4-refactor.md` —— 本次重构的推进记录
