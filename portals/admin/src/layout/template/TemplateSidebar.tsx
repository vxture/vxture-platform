"use client";

/* 1:1 转写自设计稿 shell.jsx Sidebar — 类名/DOM 不改，数据来自 admin 导航域注册表。
 * 与 console TemplateSidebar 唯一差异：active 判定用 activeHref（admin 路由有嵌套，
 * 需前缀匹配，已在 AdminAppShell 计算好）。 */

import { useState } from "react";

export interface TplNavItem {
  href: string;
  label: string;
  phicon: string;
}
export interface TplNavGroup {
  group: string;
  items: TplNavItem[];
}
export interface TplFooter {
  icon: string;
  title: string;
  pct: number;
  meta: string;
}

export interface TemplateSidebarProps {
  groups: TplNavGroup[];
  activeHref: string | undefined;
  onNavigate: (href: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  domainName?: string | undefined;
  footer: TplFooter;
  labels: {
    expandNav: string;
    collapseNav: string;
    expandAllGroups: string;
    collapseAllGroups: string;
  };
}

export function TemplateSidebar({
  groups,
  activeHref,
  onNavigate,
  collapsed,
  onToggle,
  domainName,
  footer,
  labels,
}: TemplateSidebarProps) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const flat = groups.flatMap((g) => g.items);
  const totalItems = flat.length;
  const showCollapseAll = totalItems > 10;
  const allClosed = groups.every((g) => closed[g.group]);
  const toggleSection = (g: string) => setClosed((s) => ({ ...s, [g]: !s[g] }));
  const toggleAll = () => {
    const next = !allClosed;
    const m: Record<string, boolean> = {};
    groups.forEach((g) => {
      m[g.group] = next;
    });
    setClosed(m);
  };

  return (
    <aside className={"sidebar" + (collapsed ? " is-collapsed" : "")}>
      <div className="side-rail">
        <button
          className="rail-toggle"
          onClick={onToggle}
          title={collapsed ? labels.expandNav : labels.collapseNav}
          aria-label={collapsed ? labels.expandNav : labels.collapseNav}
        >
          <i
            className={
              "ph " + (collapsed ? "ph-text-indent" : "ph-text-outdent")
            }
          ></i>
        </button>
        {!collapsed && domainName && (
          <span className="side-domain" title={domainName}>
            {domainName}
          </span>
        )}
        {!collapsed && showCollapseAll && (
          <button
            className="side-collapse-all"
            onClick={toggleAll}
            title={
              allClosed ? labels.expandAllGroups : labels.collapseAllGroups
            }
            aria-label={
              allClosed ? labels.expandAllGroups : labels.collapseAllGroups
            }
          >
            <i
              className={
                "ph " +
                (allClosed ? "ph-caret-double-down" : "ph-caret-double-up")
              }
            ></i>
          </button>
        )}
      </div>

      <nav className="side-nav">
        {groups.map((g) => {
          const isClosed = !!closed[g.group];
          return (
            <section key={g.group} className="nav-section">
              {collapsed ? (
                <button
                  className="nav-section-rail"
                  onClick={() => toggleSection(g.group)}
                  title={g.group}
                  aria-label={g.group}
                  aria-expanded={!isClosed}
                >
                  <i
                    className={
                      "ph " + (isClosed ? "ph-caret-right" : "ph-caret-down")
                    }
                  ></i>
                </button>
              ) : (
                <button
                  className="nav-section-trigger"
                  onClick={() => toggleSection(g.group)}
                  aria-expanded={!isClosed}
                >
                  <span className="nav-section-title">{g.group}</span>
                  <i
                    className={
                      "ph nav-section-caret " +
                      (isClosed ? "ph-caret-right" : "ph-caret-down")
                    }
                  ></i>
                </button>
              )}
              {!isClosed && (
                <div className="nav-items">
                  {g.items.map((it) => (
                    <button
                      key={it.href}
                      className={
                        "nav-item" + (activeHref === it.href ? " active" : "")
                      }
                      onClick={() => onNavigate(it.href)}
                      title={it.label}
                      aria-label={it.label}
                    >
                      <i className={"ph " + it.phicon}></i>
                      <span className="nav-item-label">{it.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="side-foot">
          <div className="side-foot-card">
            <div className="sfc-top">
              <i className={"ph-fill " + footer.icon}></i>
              <span>{footer.title}</span>
            </div>
            <div className="sfc-bar">
              <span style={{ width: footer.pct + "%" }}></span>
            </div>
            <div className="sfc-meta">{footer.meta}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
