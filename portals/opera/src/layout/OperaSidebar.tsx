"use client";

/**
 * OperaSidebar — Opera 侧栏导航（token 化重建）。
 *
 * 两条独立开关：
 * 1. collapsed —— 侧栏整体宽度 256/64（视口极窄时降到 48，rail 态）。
 * 2. sectionsCollapsed —— 仅隐藏分组标题（"全局收合菜单"），导航项本身不受影响。
 *
 * 图标位置稳定性：每个导航项的图标都套一个固定宽度 w-control-md 的导轨盒，
 * 侧栏左右内边距（px-sm）在两态间恒定不变——图标的横坐标因此在收缩/展开之间
 * 绝不跳动，与顶部头部的收合按钮天然对齐成一列。标签用 opacity 淡出 + 父级
 * flex-1 随宽度动画自然收窄（不用显式 max-width，单一动画源＝侧栏宽度本身）。
 *
 * 不设背景、不设边线：与内容区同底色，仅靠留白分界。滚动条视觉隐藏但滚动
 * 行为保留（overflow-y-auto + scrollbar-width:none）。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Icon,
  ShellIconButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@vxture/design-system";
import { operaNavSections, type OperaNavItem } from "@/config/navigation";

const LS_SECTIONS_COLLAPSED = "vx-opera-nav-sections-collapsed";

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

/** 导轨盒：宽度恒为 control-md，两态下图标横坐标不变。 */
function NavRail({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex w-control-md shrink-0 items-center justify-center">
      {children}
    </span>
  );
}

/** 标签：跟随侧栏宽度动画自然收窄，自身只淡入淡出。 */
function NavLabel({
  collapsed,
  className,
  children,
}: {
  collapsed: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "min-w-0 flex-1 overflow-hidden whitespace-nowrap opacity-100",
        "transition-opacity duration-base ease-standard motion-reduce:transition-none",
        collapsed && "opacity-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

function NavItemRow({
  item,
  collapsed,
  active,
}: {
  item: OperaNavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-control-md items-center rounded-md px-sm",
        "text-label-md outline-none transition-colors duration-fast ease-standard",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-surface-selected text-primary-text"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <NavRail>
        <Icon name={item.icon} size="sm" />
      </NavRail>
      <NavLabel collapsed={collapsed}>{item.label}</NavLabel>
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function OperaSidebar({
  domainName,
  collapsed,
  onToggleCollapsed,
  isActive,
}: {
  domainName: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isActive: (href: string) => boolean;
}) {
  const [sectionsCollapsed, setSectionsCollapsed] = useState(false);

  useEffect(() => {
    setSectionsCollapsed(readFlag(LS_SECTIONS_COLLAPSED));
  }, []);

  const toggleSections = () =>
    setSectionsCollapsed((prev) => {
      const next = !prev;
      writeFlag(LS_SECTIONS_COLLAPSED, next);
      return next;
    });

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col overflow-y-auto py-md px-sm",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        "transition-[width] duration-slow ease-standard motion-reduce:transition-none will-change-[width]",
        collapsed
          ? "w-sidebar-collapsed max-sm:w-sidebar-rail"
          : "w-sidebar-expanded",
      )}
    >
      <div className="flex h-control-md shrink-0 items-center gap-2xs">
        <ShellIconButton
          icon="sidebar"
          label={collapsed ? "展开导航" : "收起导航"}
          onClick={onToggleCollapsed}
        />
        <NavLabel
          collapsed={collapsed}
          className="text-label-md font-medium text-foreground"
        >
          {domainName}
        </NavLabel>
        {!collapsed && (
          <ShellIconButton
            icon={sectionsCollapsed ? "caret-double-down" : "caret-double-up"}
            label={sectionsCollapsed ? "展开分组标题" : "收起分组标题"}
            onClick={toggleSections}
          />
        )}
      </div>

      <nav className="mt-lg flex flex-col gap-lg">
        {operaNavSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2xs">
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-base ease-standard motion-reduce:transition-none",
                collapsed || sectionsCollapsed
                  ? "grid-rows-[0fr]"
                  : "grid-rows-[1fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-sm pb-2xs text-overline text-muted-foreground">
                  {section.title}
                </p>
              </div>
            </div>
            <nav className="flex flex-col gap-2xs" aria-label={section.title}>
              {section.items.map((item) => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  active={isActive(item.href)}
                />
              ))}
            </nav>
          </div>
        ))}
      </nav>
    </aside>
  );
}
