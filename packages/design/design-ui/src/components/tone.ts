/**
 * tone.ts - 语气刻度，base / composite / ai-elements 跨层共用。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components
 *
 * 六档语气只表达**严重度**，不表达业务状态。这里没有 `overdue` / `suspended`
 * 之类的值——把"订阅逾期"映射成 `warning` 是产品的判断，不同产品对同一状态的严重度
 * 本就可以不同；DS 一旦收下这个映射就等于把业务语义焊了进来。
 *
 * 单独成文件而不是挂在某一件上：`StatusBadge` 与 `Banner` 说的是同一件事，同一个
 * 语气在两处有两个名字迟早对不上。新的组件要表达语气，一律引这里。
 */

import type { IconName } from "../icons";

/**
 * 六档语气的**运行时数组**，类型由它推导。预览面、图案件要遍历全部档位时引这里，
 * 不再各自手抄一份——手抄的清单加了档位不会跟着加，且不报错。
 * 下方三个 Record<Tone, …> 以此类型为键，档位漂移在编译期即报。
 */
export const TONES = [
  "neutral",
  "brand",
  "info",
  "success",
  "warning",
  "danger",
] as const;

export type Tone = (typeof TONES)[number];

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

/**
 * 顶缘色条 + 同色前景，用于指标卡这类"整块归属某个语气"的件。
 *
 * 与 `toneSurfaceClasses` 的分工：那一套给整块上弱化底色，适合标与提示条——
 * 它们本身就小。指标卡占一整块，整块染色会盖过读数本身，所以只染一条边。
 */
export const toneEdgeClasses: Record<Tone, string> = {
  neutral: "border-t-border text-muted-foreground",
  brand: "border-t-primary text-primary-text",
  info: "border-t-info-border text-info-text",
  success: "border-t-success-border text-success-text",
  warning: "border-t-warning-border text-warning-text",
  danger: "border-t-destructive-border text-destructive-text",
};

/**
 * 行首色缘：**只染边，不染字**。用于表格行的业务语气（`DataTable.rowTone`）。
 *
 * 与 `toneEdgeClasses` 的两处不同：
 * - 方向是左缘（`border-l`）而非顶缘——顶缘属于"一块内容的开始"，行没有那个语义，
 *   行需要的是在一列行里横向可扫。
 * - 不带前景色。行内文字由各单元格自己决定（状态标、金额、链接各有各的颜色），
 *   整行统一染字会把它们全部抹平。
 *
 * 只出色缘、不铺行底：一屏几十行，铺底会让表格变成色块；而且 DataTable 的
 * hover / 选中已经在每个单元格上画了半透明底，业务色再叠一层就是文件头记的那种
 * 两层半透明合成。
 */
export const toneLeadingEdgeClasses: Record<Tone, string> = {
  neutral: "border-l-border",
  brand: "border-l-primary",
  info: "border-l-info-border",
  success: "border-l-success-border",
  warning: "border-l-warning-border",
  danger: "border-l-destructive-border",
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
