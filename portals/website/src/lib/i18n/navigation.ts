/**
 * i18n 导航工具
 * @package @vxture/website
 * @layer Presentation
 * @category I18n
 */

import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
