"use client";

/**
 * OperaShell — Opera 外壳（DS 透明模式重建）。
 *
 * 页面与侧栏同底（单一实底 bg-background）；头部区块走品牌微染发丝线，
 * 侧栏本身不设边线（见 OperaSidebar）。外壳零件取 DS（ShellBrand /
 * ShellThemeToggle / ShellUserMenu），布局尺度绑 T2（h-header-md 48）。
 * 侧栏收放逻辑见 ./OperaSidebar。不引 shell-template.css，不写本地 CSS。
 *
 * 会话：生产由边缘网关兜底；开发环境无网关时用占位 operator 渲染（界面
 * 先行、功能排期），占位在用户菜单里明确标注。
 */

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Icon,
  ShellBrand,
  ShellThemeToggle,
  ShellUserMenu,
  ToastProvider,
  TooltipProvider,
  cn,
  useTheme,
} from "@vxture/design-system";
import { OperaSidebar } from "./OperaSidebar";
import { useOperatorSession } from "@/features/session/SessionProvider";

const LS_NAV = "vx-opera-nav-collapsed";

/** 实线开区块（工具栏与内容），透明模式发丝线；侧栏不设边线，见 OperaSidebar。 */
const HAIRLINE = "border-primary/10 dark:border-primary/20";

const DEV_OPERATOR = { displayName: "Dev Operator", role: "platform-admin" };

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
    /* Tooltip 与 Toast 都是**必须有 Provider 才能用**的：Radix 的 Tooltip.Root
     * 在没有 Provider 时直接抛错（收起导航的图标提示会整页崩），useToast 同理。
     * 挂在外壳上，全部页面共用一套延迟与一个 toast 队列。 */
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        <div className="flex h-dvh flex-col bg-background text-foreground">
          <header
            className={cn(
              "flex h-header-md shrink-0 items-center justify-between gap-md border-b px-md",
              HAIRLINE,
            )}
          >
            <div className="flex min-w-0 items-center gap-sm">
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
            <OperaSidebar
              domainName="Opera"
              collapsed={collapsed}
              onToggleCollapsed={toggleNav}
              isActive={isActive}
            />

            <main className="min-w-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex max-w-content-wide-2xl flex-col p-xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </TooltipProvider>
  );
}
