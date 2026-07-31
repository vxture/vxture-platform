/**
 * radius-map.mjs — radius 标签向 Tailwind 刻度的对齐表。
 *
 * 由 generate-semantic-scales.mjs（生成 T2）与 generate-component.mjs（解析
 * T3 别名）共用。**必须共用**：两处各写一份必然漂移，且漂移是静默的——
 * T3 解析出的变量名依然存在，只是指向了另一档，肉眼与存在性断言都看不出来。
 *
 * 背景：Tailwind v4 的 rounded-* 编译为 `border-radius: var(--radius-<label>)`，
 * 与主题变量同名。设计稿的 radius 刻度比 Tailwind 整体错位一档（设计稿 md=8px，
 * Tailwind md=6px），在 :root 定义同名变量会静默改掉仓库中全部 rounded-*
 * 工具类（实测 83 处）。两条刻度取值集合本就相同（2/4/6/8/12/16），仅标签错位，
 * 故按值对齐即可消除遮蔽，并与既有 --vx-radius-* 一致。
 */

/** 设计稿 token 路径 → Tailwind 标签（按取值对齐）。 */
export const RADIUS_TO_TAILWIND = {
  "radius/2xs": "xs",
  "radius/xs": "sm",
  "radius/sm": "md",
  "radius/md": "lg",
  "radius/lg": "xl",
  "radius/xl": "2xl",
};

/**
 * 不发的档位：设计稿 radius/2xl（20px）在 Tailwind 刻度上无对应
 * （16 之后为 24），且无任何 token 引用。需回报设计侧确认并入 24px 还是删除。
 */
export const RADIUS_DROPPED = new Set(["radius/2xl"]);

/** 设计稿 radius 路径 → 最终 CSS 变量名；非 radius 路径返回 null。 */
export function radiusVarName(tokenPath) {
  const label = RADIUS_TO_TAILWIND[tokenPath];
  return label ? `--radius-${label}` : null;
}
