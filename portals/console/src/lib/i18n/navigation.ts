/**
 * next-intl 导航工具 — 提供 locale-aware 的 Link、useRouter、usePathname
 *
 * 全局唯一导入源：所有组件的 Link / router / pathname 均从此处引入，
 * 禁止直接从 'next/link' 或 'next/navigation' 引入这些符号。
 *
 * @package @vxture/console
 * @layer Presentation
 * @category I18n
 * @author AI-Generated
 * @date 2026-05-05
 */

import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
