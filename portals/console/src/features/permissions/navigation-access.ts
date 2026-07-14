import type { Capability } from "@/entities/console";
import type {
  ConsoleDomain,
  NavigationItem,
  NavigationSection,
} from "@/config/navigation";
import { hasAnyCapability, hasCapability } from "./can";

export interface NavAccessContext {
  capabilities: Capability[];
  tenantType?: "personal" | "organization" | undefined;
}

/** 已通过授权过滤、且至少保留一个非空 section 的功能域。 */
export interface VisibleDomain extends ConsoleDomain {
  sections: NavigationSection[];
}

/** 屏级 + 租户类型门控（第 2、3 级）。 */
function isItemAllowed(item: NavigationItem, ctx: NavAccessContext): boolean {
  const allowedByCapability = hasCapability(ctx.capabilities, item.capability);
  const allowedByTenantType =
    !item.tenantTypes ||
    (ctx.tenantType ? item.tenantTypes.includes(ctx.tenantType) : false);
  return allowedByCapability && allowedByTenantType;
}

function filterSections(
  sections: NavigationSection[],
  ctx: NavAccessContext,
): NavigationSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isItemAllowed(item, ctx)),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * 三级授权过滤链：域级（capabilityAnyOf）→ 屏级（item.capability）→ 租户类型。
 * 返回保留有可见内容的功能域（空域被丢弃）。
 */
export function selectVisibleDomains(
  domains: ConsoleDomain[],
  ctx: NavAccessContext,
): VisibleDomain[] {
  return domains
    .filter((domain) =>
      hasAnyCapability(ctx.capabilities, domain.capabilityAnyOf),
    )
    .map((domain) => ({
      ...domain,
      sections: filterSections(domain.sections, ctx),
    }))
    .filter((domain) => domain.sections.length > 0);
}

/** 依当前路由推导其所属功能域（用于 rail 域名显示）。 */
export function findActiveDomain(
  domains: VisibleDomain[],
  pathname: string,
): VisibleDomain | undefined {
  return domains.find((domain) =>
    domain.sections.some((section) =>
      section.items.some((item) => item.href === pathname),
    ),
  );
}
