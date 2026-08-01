/**
 * tone.ts - 语气刻度，图案层共用。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 六档语气只表达**严重度**，不表达业务状态。这里没有 `overdue` / `suspended`
 * 之类的值——把"订阅逾期"映射成 `warning` 是产品的判断，不同产品对同一状态的严重度
 * 本就可以不同；DS 一旦收下这个映射就等于把业务语义焊了进来。
 *
 * 单独成文件而不是挂在某一件上：`StatusBadge` 与 `Banner` 说的是同一件事，同一个
 * 语气在两处有两个名字迟早对不上。新的图案要表达语气，一律引这里。
 */

import type { IconName } from "../../icons";

export type Tone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger";

/** 描边 + 弱化底 + 同色前景，用于标与提示条这类需要托底的件。 */
export const toneSurfaceClasses: Record<Tone, string> = {
  neutral: "border-border bg-accent text-muted-foreground",
  brand: "border-primary-border bg-primary-muted text-primary-text",
  info: "border-info-border bg-info-muted text-info-text",
  success: "border-success-border bg-success-muted text-success-text",
  warning: "border-warning-border bg-warning-muted text-warning-text",
  danger:
    "border-destructive-border bg-destructive-muted text-destructive-text",
};

/** 语气对应的图标。调用方不传图标名，避免同一语气在各处配不同的图。 */
export const toneIcons: Record<Tone, IconName> = {
  neutral: "info",
  brand: "sparkles",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
};
