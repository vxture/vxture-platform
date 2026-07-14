import type { ReactNode } from "react";
import { PageHeader as DesignPageHeader } from "@vxture/design-system";
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
    <DesignPageHeader
      icon={icon}
      title={title}
      description={description}
      actions={
        secondary || action ? (
          <>
            {secondary}
            {action}
          </>
        ) : null
      }
      className={`admin-overview-heading admin-overview-heading--page vx-page-header--icon-${icon}`}
      iconClassName="admin-overview-heading__icon"
      copyClassName="admin-overview-heading__copy"
    />
  );
}
