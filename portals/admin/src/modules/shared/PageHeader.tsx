/**
 * PageHeader.tsx - 管理后台页面标题。
 * @package @vxture/admin
 * @layer Presentation
 * @category Modules - Shared
 *
 * 本文件只是给 48 个调用点保留的形状适配层：admin 传的是
 * `{ title, description, action, secondary }`，DS 的 `SectionHeader` 收的是
 * `{ title, description, action }`——两个动作在这里合成一个槽。
 *
 * 原实现包的是 DS 的 `PageHeader`，那件在 DS 分类重构（22ca6ccc）里被
 * `SectionHeader` 取代，admin 一直没跟着改，于是这条 import 挂了。
 *
 * 一并去掉的是 `admin-overview-heading*` 三个 class 钩子：那套 CSS 用
 * `--vx-admin-overview-*` 局部变量把标题的字号、图标尺寸、色值又实现了一遍，
 * 与 T2 语义层各说各话。改用 SectionHeader 后这些取值由 DS 出，钩子失去作用。
 * （样式文件本身保留不动。）
 */

import type { ReactNode } from "react";
import { SectionHeader } from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";

interface AdminPageHeaderProps {
  eyebrow?: string;
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  secondary?: ReactNode;
}

export function PageHeader({
  icon = "squares-four",
  title,
  description,
  action,
  secondary,
}: AdminPageHeaderProps) {
  return (
    <SectionHeader
      level={1}
      icon={icon}
      title={title}
      description={description}
      action={
        secondary || action ? (
          <div className="flex items-center gap-sm">
            {secondary}
            {action}
          </div>
        ) : null
      }
    />
  );
}
