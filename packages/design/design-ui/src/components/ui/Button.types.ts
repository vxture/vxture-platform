/**
 * Button variant / size — defined alongside the Button component.
 * @package @vxture/design-ui
 *
 * 两族都是**运行时数组**，类型由它推导。预览面、图案件要遍历全部挡位时引这里，
 * 不再各自手抄一份——手抄的清单加了挡位不会跟着加，且不报错。
 */

export const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  /** 入口用：行内删除、菜单危险项。淡底，见 060 §1.2.1 危险两档。 */
  "destructive",
  /** 落锤用：确认对话框的提交。实心。 */
  "destructive-strong",
  "link",
] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/**
 * 尺寸档与 shadcn vega 对齐：xs 24 / sm 32 / default 36 / lg 40（默认密度下）。
 * 四个 icon 档是同高的正方形，用于只有图标没有文字的按钮。
 */
export const BUTTON_SIZES = [
  "xs",
  "sm",
  "default",
  "lg",
  "icon-xs",
  "icon-sm",
  "icon",
  "icon-lg",
] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];
