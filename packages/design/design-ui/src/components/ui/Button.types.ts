/**
 * Button variant — defined alongside the Button component.
 * @package @vxture/design-ui
 */
export type ButtonVariant =
  | "default"
  | "destructive"
  | "destructive-strong"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

/**
 * 尺寸档与 shadcn vega 对齐：xs 24 / sm 32 / default 36 / lg 40（默认密度下）。
 * 四个 icon 档是同高的正方形，用于只有图标没有文字的按钮。
 */
export type ButtonSize =
  | "xs"
  | "sm"
  | "default"
  | "lg"
  | "icon-xs"
  | "icon-sm"
  | "icon"
  | "icon-lg";
