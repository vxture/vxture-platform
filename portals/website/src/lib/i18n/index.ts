/**
 * i18n 模块统一导出
 * @package @vxture/website
 * @layer Presentation
 * @category I18n
 */

export { routing } from "./routing";
export type { LocaleParams } from "./routing";
export { Link, redirect, usePathname, useRouter } from "./navigation";
export { default as getRequestConfig } from "./request";
