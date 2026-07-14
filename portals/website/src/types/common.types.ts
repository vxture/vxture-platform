/**
 * 通用类型定义
 * @package @vxture/website
 * @layer Presentation
 * @category Types
 */

export interface LocaleType {
  locale: string;
  label: string;
  flag: string;
}

export type ThemeMode = "light" | "dark" | "system";
