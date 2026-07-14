/**
 * cn.ts - 类名合并工具
 * @package @vxture/design-system
 *
 * 功能：组合 clsx 和 tailwind-merge 提供安全的 Tailwind 类名合并
 *       解决 Tailwind 类名冲突问题，支持条件类名
 *
 * @copyright Vxture Team
 * @layer Shared
 * @category Utils
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 类名合并工具函数
 *
 * 组合 clsx 和 tailwind-merge，安全地合并 TailwindCSS 类名
 * 自动处理类名冲突，支持条件类名
 *
 * @param inputs - 类名列表，支持字符串、对象、数组等多种格式
 * @returns 合并后的类名字符串
 * @example
 * ```tsx
 * cn('btn', { 'btn-primary': isPrimary }, ['px-4', 'py-2'])
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
