"use client";

/* Admin 壳层容器 — 1:1 转写自设计稿 main-template.jsx App（admin 形态）。
 * Header 置顶 + .app-body(Sidebar / 内容 / Assistant) + Drawer。
 * 顶层视图 = 管理工作域（运营域 / 自治域），launcher 切换即路由跳转；
 * 导航来自 adminWorkspaces；助手为真实 VardaChat（admin surface）。 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminSession } from "@/features/session/AdminSessionProvider";
import {
  adminWorkspaces,
  getAdminNavigationItemByPath,
  getAdminWorkspaceByPath,
  type AdminWorkspaceId,
} from "@/config/navigation";
import { useConsoleTranslations } from "@/lib/ConsoleIntl";
import type { ShellView, ShellDrawerType, AssistantMode } from "./shell/types";
import { phNavIcon } from "./icons-map";
import { TemplateHeader, type HeaderViewOption } from "./TemplateHeader";
import { TemplateSidebar, type TplNavGroup } from "./TemplateSidebar";
import { TemplateAssistant } from "./TemplateAssistant";
import { TemplateDrawer, type DrawerNotif } from "./TemplateDrawer";

const LS = {
  nav: "vx-admin-tpl-nav-collapsed",
  vela: "vx-admin-tpl-vela-open",
  velaMode: "vx-admin-tpl-vela-mode",
};

/** 工作域 id → launcher 图标（Phosphor）。 */
const WORKSPACE_PH_ICON: Record<AdminWorkspaceId, string> = {
  "tenant-ops": "ph-buildings",
  "platform-autonomy": "ph-shield-check",
};

function ShellFrame({ children }: { children: ReactNode }) {
  const { session, status, signOut } = useAdminSession();
  const router = useRouter();
  const pathname = usePathname();
  const tNav = useConsoleTranslations("navigation");
  const tShell = useConsoleTranslations("shell");
  const tDrawer = useConsoleTranslations("drawer");

  const [navCollapsed, setNavCollapsed] = useState(false);
  const [velaOpen, setVelaOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("narrow");
  const [drawer, setDrawer] = useState<ShellDrawerType | null>(null);

  // hydrate persisted UI state (client-only, avoids SSR mismatch)
  useEffect(() => {
    try {
      setNavCollapsed(window.localStorage.getItem(LS.nav) === "true");
      setVelaOpen(window.localStorage.getItem(LS.vela) === "1");
      const m = window.localStorage.getItem(LS.velaMode);
      if (m === "narrow" || m === "wide" || m === "full") setAssistantMode(m);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (status === "ready" && (!session.isAuthenticated || !session.user)) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, session.isAuthenticated, session.user, status]);

  const toggleNav = () =>
    setNavCollapsed((c) => {
      const n = !c;
      try {
        window.localStorage.setItem(LS.nav, String(n));
      } catch {
        /* ignore */
      }
      return n;
    });
  const persistVela = (open: boolean, mode: AssistantMode) => {
    try {
      window.localStorage.setItem(LS.vela, open ? "1" : "0");
      window.localStorage.setItem(LS.velaMode, mode);
    } catch {
      /* ignore */
    }
  };
  const openVela = (open: boolean) => {
    setVelaOpen(open);
    persistVela(open, assistantMode);
  };
  const closeAssistant = () => {
    setVelaOpen(false);
    setAssistantMode("narrow");
    persistVela(false, "narrow");
  };
  const toggleAssistantWide = () => {
    const goingWide = assistantMode !== "wide";
    const next: AssistantMode = goingWide ? "wide" : "narrow";
    setAssistantMode(next);
    persistVela(velaOpen, next);
    if (goingWide) {
      setNavCollapsed(true);
      try {
        window.localStorage.setItem(LS.nav, "true");
      } catch {
        /* ignore */
      }
    }
  };
  const toggleAssistantFull = () => {
    const next: AssistantMode = assistantMode === "full" ? "narrow" : "full";
    setAssistantMode(next);
    persistVela(velaOpen, next);
  };

  const navigate = (href: string) => {
    router.push(href);
    const main = document.querySelector(".content-scroll");
    if (main) main.scrollTop = 0;
  };

  // ── 顶层视图（管理工作域）──
  const activeWorkspace = getAdminWorkspaceByPath(pathname);
  const views: HeaderViewOption[] = adminWorkspaces.map((w) => ({
    id: w.id,
    name: w.label,
    desc: w.description,
    icon: WORKSPACE_PH_ICON[w.id] ?? "ph-squares-four",
  }));
  const selectView = (id: ShellView) => {
    const w = adminWorkspaces.find((x) => x.id === id);
    if (w) navigate(w.homeHref);
  };

  // ── 侧栏导航分组（来自当前工作域）──
  const navGroups: TplNavGroup[] = useMemo(
    () =>
      activeWorkspace.sections.map((section) => ({
        group: tNav(`sections.${section.id}`, section.title),
        items: section.items.map((it) => ({
          href: it.href,
          label: tNav(`items.${it.id}.label`, it.label),
          phicon: phNavIcon(it.icon),
        })),
      })),
    [activeWorkspace, tNav],
  );
  const activeHref = getAdminNavigationItemByPath(pathname)?.item.href;

  // 侧栏底部卡片 · 占位重点指标（待接真实平台健康度 BFF）。
  const footer = {
    icon: "ph-heartbeat",
    title: tShell("metricCard.title", "平台健康度"),
    pct: 99,
    meta: tShell("metricCard.meta", "服务可用率 99.2%"),
  };

  // ── Drawer 占位数据（demo，待接真实消息中心 / 系统设置）──
  const drawerNotifs: DrawerNotif[] = [
    {
      level: "danger",
      icon: "ph-warning-octagon",
      title: tDrawer("notifications.items.audit.title", "高风险操作待审批"),
      meta: tDrawer("notifications.items.audit.meta", "审批中心 · 12 分钟前"),
      href: "/approval-center",
    },
    {
      level: "warning",
      icon: "ph-warning",
      title: tDrawer("notifications.items.service.title", "服务可用率低于阈值"),
      meta: tDrawer("notifications.items.service.meta", "服务监控 · 1 小时前"),
      href: "/service-monitor",
    },
    {
      level: "info",
      icon: "ph-ticket",
      title: tDrawer("notifications.items.ticket.title", "新增待处理工单 6 条"),
      meta: tDrawer("notifications.items.ticket.meta", "工单中心 · 今日"),
      href: "/tickets",
    },
  ];
  const settingsRows: Array<[string, string]> = [
    [
      tDrawer("settings.rows.theme.label", "默认主题"),
      tDrawer("settings.rows.theme.value", "跟随系统"),
    ],
    [
      tDrawer("settings.rows.density.label", "界面密度"),
      tDrawer("settings.rows.density.value", "默认"),
    ],
    [
      tDrawer("settings.rows.sessionTimeout.label", "会话超时"),
      tDrawer("settings.rows.sessionTimeout.value", "30 分钟"),
    ],
    [
      tDrawer("settings.rows.auditRetention.label", "审计日志保留"),
      tDrawer("settings.rows.auditRetention.value", "180 天"),
    ],
  ];
  const drawerLabels = {
    notificationsTitle: tDrawer("notifications.title", "消息中心"),
    settingsTitle: tDrawer("settings.title", "系统设置"),
    markAllRead: tDrawer("notifications.markAllRead", "全部已读"),
    openCenter: tDrawer("openCenter", "前往消息中心"),
    close: tDrawer("close", "关闭"),
  };

  const sidebarLabels = {
    expandNav: tShell("sidebar.expandNav", "展开导航"),
    collapseNav: tShell("sidebar.collapseNav", "收起导航"),
    expandAllGroups: tShell("sidebar.expandAllGroups", "展开全部分组"),
    collapseAllGroups: tShell("sidebar.collapseAllGroups", "收起全部分组"),
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };
  const handleSwitchUser = async () => {
    await signOut();
    router.replace("/login");
  };

  const velaActive = velaOpen;

  if (status !== "ready") {
    return (
      <div className="app">
        <div className="vxh vxh--skeleton" aria-hidden="true">
          <div className="vxh-left">
            <div className="vxh-skeleton-block vxh-skeleton-block--icon" />
            <div className="vxh-skeleton-block vxh-skeleton-block--brand" />
          </div>
          <div className="vxh-skeleton-block vxh-skeleton-block--search" />
          <div className="vxh-actions">
            <div className="vxh-skeleton-block vxh-skeleton-block--circle" />
            <div className="vxh-skeleton-block vxh-skeleton-block--circle" />
            <div className="vxh-skeleton-block vxh-skeleton-block--circle" />
          </div>
        </div>
        <div className="app-body">
          <div className="sidebar">
            <div className="vxh-skeleton-nav">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="vxh-skeleton-block vxh-skeleton-block--nav"
                />
              ))}
            </div>
          </div>
          <main className="content-scroll">
            <div className="content-inner vxh-skeleton-content">
              <div className="vxh-skeleton-block vxh-skeleton-block--title" />
              <div className="vxh-skeleton-block vxh-skeleton-block--card" />
              <div className="vxh-skeleton-block vxh-skeleton-block--card" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!session.isAuthenticated || !session.user) {
    return null;
  }

  return (
    <div
      className={
        "app" +
        (velaActive ? " vela-open" : "") +
        (navCollapsed ? " nav-collapsed" : "")
      }
    >
      <TemplateHeader
        views={views}
        activeViewId={activeWorkspace.id}
        onSelectView={selectView}
        activeMenuName={activeWorkspace.label}
        velaOpen={velaOpen}
        setVelaOpen={openVela}
        showVela
        openDrawer={(t) => setDrawer(t)}
        onNavigate={navigate}
        onSwitchUser={handleSwitchUser}
        onSignOut={handleSignOut}
        brandName="Vxture Control Center"
      />

      <div className="app-body">
        <TemplateSidebar
          groups={navGroups}
          activeHref={activeHref}
          onNavigate={navigate}
          collapsed={navCollapsed}
          onToggle={toggleNav}
          domainName={activeWorkspace.label}
          footer={footer}
          labels={sidebarLabels}
        />
        <main className="content-scroll">
          <div className="content-inner">{children}</div>
        </main>
        {velaActive && (
          <TemplateAssistant
            mode={assistantMode}
            onClose={closeAssistant}
            onToggleWide={toggleAssistantWide}
            onToggleFull={toggleAssistantFull}
          />
        )}
      </div>

      {drawer && (
        <TemplateDrawer
          type={drawer}
          onClose={() => setDrawer(null)}
          onNavigate={navigate}
          notifications={drawerNotifs}
          settingsRows={settingsRows}
          labels={drawerLabels}
        />
      )}
    </div>
  );
}

export function AdminAppShell({ children }: { children: ReactNode }) {
  return <ShellFrame>{children}</ShellFrame>;
}
