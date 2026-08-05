/**
 * display.ts —— admin 的展示文案约定。
 *
 * @package @vxture/admin
 * @layer Presentation
 * @category Shared
 */

/**
 * 详情字段的空值占位。
 *
 * 原先藏在各详情页私有的 `DetailField` 里（`{value || "未设置"}`），于是调用点分成
 * 两派：一派靠组件兜底，一派自己写 `?? "未设置"`（BillingDetailPage 与
 * OrderDetailPage 都有）。换成 DS 的 `DetailRow` 后组件不再兜底，兜底就得显式——
 * 顺带把两派统一了。
 *
 * 不进 DS：占位文案是产品语汇（admin 说"未设置"，别处可能说"—"或留空），
 * DS 收了就得替所有产品选词。
 */
export function orUnset(value: string | null | undefined): string {
  return value || "未设置";
}
