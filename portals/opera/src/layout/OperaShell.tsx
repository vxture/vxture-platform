"use client";

/**
 * OperaShell — Opera 外壳（DS 透明模式重建）。
 *
 * 页面与侧栏同底（单一实底 bg-background），分界全部走品牌微染发丝线；
 * 外壳零件取 DS（ShellBrand / ShellIconButton / ShellThemeToggle /
 * ShellUserMenu），布局尺度绑 T2（h-header-md 48 / w-sidebar-{expanded,
 * collapsed} 256/64）。不引 shell-template.css，不写本地 CSS。
 *
 * 会话：生产由边缘网关兜底；开发环境无网关时用占位 operator 渲染（界面
 * 先行、功能排期），占位在用户菜单里明确标注。
 */

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Icon,
  ShellBrand,
  ShellIconButton,
  ShellThemeToggle,
  ShellUserMenu,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  useTheme,
} from "@vxture/design-system";
import { operaNavSections } from "@/config/navigation";
import { useOperatorSession } from "@/features/session/SessionProvider";

const LS_NAV = "vx-opera-nav-collapsed";

/** 实线开区块（工具栏与内容、头与身），透明模式发丝线。 */
const HAIRLINE = "border-primary/10 dark:border-primary/20";

const DEV_OPERATOR = { displayName: "Dev Operator", role: "platform-admin" };

function NavItem({
  href,
  label,
  icon,
  collapsed,
  active,
}: {
  href: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  collapsed: boolean;
  active: boolean;
}) {
  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-control-md items-center gap-sm rounded-md px-sm",
        "text-label-md outline-none transition-colors duration-fast ease-standard",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-surface-selected text-primary-text"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        collapsed && "justify-center px-none",
      )}
    >
      <Icon name={icon} size="sm" />
      {collapsed ? null : <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function OperaShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { operator, status, signOut } = useOperatorSession();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(LS_NAV) === "true");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleNav = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(LS_NAV, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const isDev = process.env.NODE_ENV === "development";
  const effectiveOperator =
    operator ?? (isDev && status !== "loading" ? DEV_OPERATOR : null);

  if (status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Icon
          name="spinner"
          size="lg"
          className="animate-spin text-muted-foreground"
        />
      </div>
    );
  }
  if (!effectiveOperator) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header
        className={cn(
          "flex h-header-md shrink-0 items-center justify-between gap-md border-b px-md",
          HAIRLINE,
        )}
      >
        <div className="flex min-w-0 items-center gap-sm">
          <ShellIconButton
            icon="sidebar"
            label={collapsed ? "展开导航" : "收起导航"}
            onClick={toggleNav}
          />
          <ShellBrand href="/" label="Opera" />
          <span className="hidden text-body-sm text-muted-foreground md:inline">
            基础设施控制平面
          </span>
        </div>
        <div className="flex items-center gap-2xs">
          <ShellThemeToggle
            currentTheme={theme === "dark" ? "dark" : "light"}
            onThemeChange={setTheme}
          />
          <ShellUserMenu
            user={{
              displayName: effectiveOperator.displayName,
              uniqueLine: effectiveOperator.role || "operator",
              ...(operator ? {} : { meta: "开发占位会话（无边缘网关）" }),
            }}
            actions={[
              {
                key: "sign-out",
                label: "退出登录",
                icon: "sign-out",
                onClick: () => void signOut(),
              },
            ]}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "flex shrink-0 flex-col gap-lg overflow-y-auto border-r py-md",
            HAIRLINE,
            collapsed
              ? "w-sidebar-collapsed px-2xs"
              : "w-sidebar-expanded px-sm",
            "transition-all duration-base ease-standard",
          )}
        >
          {operaNavSections.map((section) => (
            <nav
              key={section.title}
              aria-label={section.title}
              className="flex flex-col gap-2xs"
            >
              {collapsed ? null : (
                <p className="px-sm text-overline text-muted-foreground">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed}
                  active={isActive(item.href)}
                />
              ))}
            </nav>
          ))}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-content-wide-2xl flex-col p-xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
