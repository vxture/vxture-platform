/**
 * spacing-merge.mjs — 间距族合并表。
 *
 * 由 generate-semantic-scales.mjs（产出 T2）与 generate-component.mjs（解析 T3 别名）
 * 共用。**必须共用**：只写在一处必然漂移，且漂移是静默的——T3 解析出的变量名
 * 若已不存在，CSS 会把它当未定义处理、无声失效。本表提取正是因为漏了这一步，
 * 被 T3 的取值断言当场拦下。
 *
 * ── 合并依据（设计侧 2026-07-31 决定）──
 * 设计稿有九个间距族，重叠严重：inset 与 gap 十一档里仅五档同值，
 * control-inset-x 基本等于 inset 只在高端收窄，control-gap / section-gap /
 * container-inset 再次重叠。差异看着像漂移而非设计。
 *
 * 且 Tailwind v4 的 `--spacing-*` 是**单一命名空间**，九个族里每个都有 "md"，
 * 不合并就只能带前缀注册（`--spacing-gap-md` → `gap-gap-md`）。
 *
 * 故七个间距族合并为一条，取 inset 的阶梯为基准：它最完整（12 档）且三档密度下
 * 都严格单调。高度族量级不同，单列。
 *
 * T2 变量名用 `--space-*` 而非 `--spacing-*`：后者是 Tailwind theme 命名空间名，
 * 同名会写出指向自己的注册（`--spacing-md: var(--spacing-md)`），CSS 判定为循环、
 * 变量整个失效且不报错。
 */

/** 折叠为 `--space-*` 的族，base 决定取哪条阶梯。 */
export const SPACING_BASE = "inset";
export const SPACING_MERGED = [
  "inset",
  "gap",
  "control-inset-x",
  "control-inset-y",
  "control-gap",
  "section-gap",
  "container-inset",
];

/** 高度族 → `--space-<kind>-*`，注册进 spacing 命名空间后得 `h-control-md` 等。 */
export const SPACING_HEIGHTS = { "control-height": "control", "row-height": "row" };

/** 设计稿间距路径 → 合并后的 CSS 变量名；非间距路径返回 null。 */
export function mergedSpacingVar(tokenPath) {
  const parts = tokenPath.split("/");
  const step = parts.pop();
  const family = parts.join("-");

  if (SPACING_MERGED.includes(family)) return `--space-${step}`;
  const kind = SPACING_HEIGHTS[family];
  return kind ? `--space-${kind}-${step}` : null;
}
