/**
 * typography.ts - 排版 Tokens
 * @package @vxture/design-system
 *
 * 功能：定义设计系统的排版 tokens
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Tokens
 */

export const typography = {
  fontFamily: {
    brand: "var(--font-brand)",
    display: "var(--font-display)",
    sans: "var(--font-sans)",
    cjk: "var(--font-cjk)",
    mono: "var(--font-mono)",
    number: "var(--font-number)",
  },

  /**
   * 字体大小
   *
   * 实际渲染值通过 CSS 变量 --vx-font-size-* 控制。
   * Density 只调整界面松紧和行距；字号缩放由独立可读性维度处理。
   */
  fontSize: {
    xs: "var(--vx-font-size-xs)",
    sm: "var(--vx-font-size-sm)",
    md: "var(--vx-font-size-md)",
    lg: "var(--vx-font-size-lg)",
    xl: "var(--vx-font-size-xl)",
    "2xl": "var(--vx-font-size-2xl)",
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;
