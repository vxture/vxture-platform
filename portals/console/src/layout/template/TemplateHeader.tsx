"use client";

/* 1:1 转写自设计稿 shell.jsx Header(.vxh) — 类名/DOM 不改，演示数据换成真实
 * 会话 / 租户 / 主题 / 语言。账单·计划行无 BFF 数据，保留为静态占位。 */

import { useState } from "react";
import { formatTenantDisplay } from "@/features/tenant/tenant-display";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { UserAvatar, useTheme } from "@vxture/design-system";
import {
  setGlobalDensityPreference,
  setGlobalLocalePreference,
  setGlobalThemePreference,
} from "@vxture/platform-browser";
import type { Locale, Theme } from "@vxture/shared";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useConsoleSession } from "@/features/session/ConsoleSessionProvider";
import { useTenant } from "@/features/tenant";
import { buildLogoutUrl, buildSwitchUrl } from "@/api/console-bff";
import type { ShellView } from "../shell/types";

/* 用户级别标识 · 5 级（1:1 自设计稿 shell.jsx USER_LEVELS）。 */
const USER_LEVELS: Record<number, { name: string; icon: string; cls: string }> =
  {
    1: { name: "普通用户", icon: "ph-user", cls: "lv1" },
    2: { name: "认证用户", icon: "ph-user-circle-check", cls: "lv2" },
    3: { name: "高级用户", icon: "ph-medal", cls: "lv3" },
    4: { name: "管理员", icon: "ph-shield-check", cls: "lv4" },
    5: { name: "超级管理员", icon: "ph-crown-simple", cls: "lv5" },
  };

export interface HeaderViewOption {
  id: ShellView;
  name: string;
  desc: string;
  icon: string;
}

export interface TemplateHeaderProps {
  view: ShellView;
  setView: (v: ShellView) => void;
  viewOptions: HeaderViewOption[];
  velaOpen: boolean;
  setVelaOpen: (open: boolean) => void;
  showVela: boolean;
  openDrawer: (type: "notifications" | "settings") => void;
  onNavigate: (href: string) => void;
  brandName: string;
  billingLabel: string;
  labels: {
    featureBoards: string;
    searchPlaceholder: string;
    help: string;
    notifications: string;
    settings: string;
    assistant: string;
    userMenu: string;
    verified: string;
    tenantOrg: string;
    tenantVerified: string;
    tenantSettings: string;
    switchOrg: string;
    prefsTitle: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    densityCompact: string;
    densityDefault: string;
    densityComfy: string;
    switchUser: string;
    signOut: string;
  };
}

export function TemplateHeader({
  view,
  setView,
  viewOptions,
  velaOpen,
  setVelaOpen,
  showVela,
  openDrawer,
  onNavigate,
  brandName,
  billingLabel,
  labels,
}: TemplateHeaderProps) {
  const { session } = useConsoleSession();
  const { tenantList, switchTenantContext } = useTenant();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, density, setDensity } = useTheme();

  const [panel, setPanel] = useState<null | "launcher" | "tenant" | "user">(
    null,
  );
  const [themePref, setThemePrefState] = useState<"system" | "light" | "dark">(
    theme === "dark" ? "dark" : "light",
  );
  const [fontSize, setFontSize] = useState<"small" | "default" | "large">(
    "default",
  );
  const t = useTranslations("shell");
  // 用户等级：暂无真实等级数据，按设计默认 fallback L01。
  const userLevel = 1;
  const lv = USER_LEVELS[userLevel];
  const isSingleTenant = tenantList.length <= 1;
  const tenantTypeLabel =
    session.tenant?.tenantType === "personal"
      ? t("personalTenant")
      : t("orgTenant");
  const toggle = (p: "launcher" | "tenant" | "user") =>
    setPanel((cur) => (cur === p ? null : p));

  const user = session.user;
  const tenant = session.tenant;
  const tenantName = tenant?.workspace ?? tenant?.name ?? labels.tenantOrg;
  const displayName = (
    user?.displayName ||
    user?.name ||
    user?.username ||
    "User"
  ).trim();
  const userPhone = user?.phone ?? "";
  const userEmail = user?.email ?? "";
  const roleLabel = user?.roleLabel ?? "";

  const setLangPref = (next: Locale) => {
    setGlobalLocalePreference(next);
    router.replace(pathname, { locale: next });
  };
  const setThemePref = (next: "system" | "light" | "dark") => {
    setThemePrefState(next);
    setTheme(next);
    setGlobalThemePreference(next as Theme);
  };
  const setDensityPref = (next: "compact" | "default" | "comfortable") => {
    setDensity(next);
    setGlobalDensityPreference(next);
  };
  // Switch user: /auth/switch → mode=switch → accounts login (re-auth as different account).
  const switchUser = () => {
    setPanel(null);
    window.location.assign(buildSwitchUrl());
  };
  // Sign out: /auth/logout → mode=signout → for console client → website home.
  const logoutToHome = () => {
    setPanel(null);
    window.location.assign(buildLogoutUrl());
  };

  return (
    <header className="vxh">
      {/* ── LEFT ── */}
      <div className="vxh-left">
        <div className="vxh-pop-anchor">
          <button
            className={
              "vxh-icon vxh-launcher" +
              (panel === "launcher" ? " is-active" : "")
            }
            title={labels.featureBoards}
            aria-label={labels.featureBoards}
            onClick={() => toggle("launcher")}
          >
            <i className="ph ph-dots-nine"></i>
          </button>
          {panel === "launcher" && (
            <div className="vxh-panel vxh-launcher-panel">
              <div className="vxh-board-list">
                {viewOptions.map((v) => (
                  <button
                    key={v.id}
                    className={
                      "vxh-board" + (v.id === view ? " is-active" : "")
                    }
                    onClick={() => {
                      setPanel(null);
                      setView(v.id);
                    }}
                  >
                    <span className="vxh-board-ico">
                      <i className={"ph " + v.icon}></i>
                    </span>
                    <span className="vxh-board-copy">
                      <strong>{v.name}</strong>
                      <span>{v.desc}</span>
                    </span>
                    {v.id === view && (
                      <i className="ph ph-check vxh-board-check"></i>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <a
          className="vxh-brand"
          href="#"
          aria-label={brandName}
          onClick={(e) => {
            e.preventDefault();
            onNavigate("/");
          }}
        >
          <Image
            className="vxh-logo"
            src="/brand/vxture-logo-white.png"
            alt=""
            aria-hidden="true"
            width={24}
            height={24}
            priority
          />
          <strong className="vxh-brand-name">{brandName}</strong>
        </a>

        <span className="vxh-divider" aria-hidden="true"></span>

        <div className="vxh-pop-anchor">
          <button
            className={"vxh-org" + (panel === "tenant" ? " is-active" : "")}
            title={labels.tenantOrg}
            aria-label={labels.tenantOrg}
            onClick={() => toggle("tenant")}
          >
            <i className="ph ph-buildings vxh-org-ico"></i>
            <span className="vxh-org-name">{tenantName}</span>
            <i className="ph ph-caret-down vxh-org-caret"></i>
          </button>
          {panel === "tenant" && (
            <div className="vxh-panel vxh-org-panel">
              <div className="vxh-org-head">
                <span className="vxh-org-avatar">
                  <i className="ph-fill ph-buildings"></i>
                </span>
                <div className="vxh-org-meta">
                  <div className="vxh-org-title">
                    {formatTenantDisplay(tenant?.name, tenant?.tenantType) ||
                      tenantName}
                  </div>
                  <span className="vxh-org-plan">
                    {tenantTypeLabel}
                    {tenant?.status === "active" ? (
                      <>
                        <i className="ph-fill ph-seal-check vxh-org-verified"></i>
                        {t("verifyActive")}
                      </>
                    ) : tenant?.status === "suspended" ||
                      tenant?.status === "cancelled" ? (
                      <>
                        <i className="ph-fill ph-warning vxh-org-verified"></i>
                        {t("verifySuspended")}
                      </>
                    ) : (
                      <>
                        <i className="ph-fill ph-seal-question vxh-org-verified"></i>
                        {t("verifyUnknown")}
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div className="vxh-acct-div"></div>
              <button
                className="vxh-acct-row"
                onClick={() => {
                  setPanel(null);
                  setView("console");
                  onNavigate("/tenant-settings");
                }}
              >
                <i className="ph ph-sliders-horizontal"></i>
                <span className="vxh-acct-label">{labels.tenantSettings}</span>
                <i className="ph ph-caret-right vxh-acct-go"></i>
              </button>
              <div className="vxh-acct-div"></div>
              <div className="vxh-prefs-title">{t("billing")}</div>
              <button
                className="vxh-acct-row vxh-bill"
                onClick={() => {
                  setPanel(null);
                  setView("console");
                  onNavigate("/billing");
                }}
              >
                <i className="ph ph-receipt"></i>
                <span className="vxh-bill-copy">
                  <strong>
                    {t("monthlyCost")} {billingLabel}
                  </strong>
                  <small>{t("monthlyCostDesc")}</small>
                </span>
              </button>
              <button
                className="vxh-acct-row vxh-bill"
                onClick={() => {
                  setPanel(null);
                  setView("console");
                  onNavigate("/billing");
                }}
              >
                <i className="ph ph-credit-card"></i>
                <span className="vxh-bill-copy">
                  <strong>{t("payBill")}</strong>
                  <small>{t("payBillDesc")}</small>
                </span>
              </button>
              <button
                className="vxh-acct-row vxh-bill"
                onClick={() => {
                  setPanel(null);
                  setView("console");
                  onNavigate("/quotas");
                }}
              >
                <i className="ph ph-wave-sine"></i>
                <span className="vxh-bill-copy">
                  <strong>{t("trafficUsage")}</strong>
                  <small>{t("trafficUsageDesc")}</small>
                </span>
              </button>
              <button
                className="vxh-acct-row vxh-bill"
                onClick={() => {
                  setPanel(null);
                  setView("console");
                  onNavigate("/quotas");
                }}
              >
                <i className="ph ph-gauge"></i>
                <span className="vxh-bill-copy">
                  <strong>{t("usageLimit")}</strong>
                  <small>{t("usageLimitDesc")}</small>
                </span>
              </button>
              <div className="vxh-acct-div"></div>
              <div className="vxh-prefs-title">{t("plan")}</div>
              <button
                className="vxh-acct-row"
                onClick={() => {
                  setPanel(null);
                  setView("console");
                  onNavigate("/subscription");
                }}
              >
                <i className="ph ph-currency-circle-dollar"></i>
                <span className="vxh-acct-label">{t("freePlan")}</span>
              </button>
              <div className="vxh-acct-div"></div>
              <button
                className={
                  "vxh-acct-row" + (isSingleTenant ? " is-disabled" : "")
                }
                disabled={isSingleTenant}
                style={isSingleTenant ? { opacity: 0.45 } : undefined}
                onClick={() => {
                  if (isSingleTenant) return;
                  const next = tenantList.find((opt) => !opt.isCurrent);
                  setPanel(null);
                  if (next) void switchTenantContext(next.id);
                }}
              >
                <i className="ph ph-arrows-left-right"></i>
                <span className="vxh-acct-label">{labels.switchOrg}</span>
                <i className="ph ph-caret-right vxh-acct-go"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 搜索栏 */}
      <label className="vxh-search">
        <i className="ph ph-magnifying-glass"></i>
        <input type="search" placeholder={labels.searchPlaceholder} />
        <kbd>⌘K</kbd>
      </label>

      {/* ── RIGHT ── */}
      <div className="vxh-actions">
        {showVela && (
          <button
            className={"vxh-agent" + (velaOpen ? " is-active" : "")}
            onClick={() => setVelaOpen(!velaOpen)}
            title={labels.assistant}
            aria-label={labels.assistant}
            aria-pressed={velaOpen}
          >
            <Image
              className="vxh-agent-icon"
              src="/assets/ai/varda-agent.gif"
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              unoptimized
            />
          </button>
        )}

        <div className="vxh-group" role="group" aria-label={labels.settings}>
          <button
            className="vxh-icon"
            title={labels.help}
            aria-label={labels.help}
          >
            <i className="ph ph-question"></i>
          </button>
          <button
            className="vxh-icon"
            title={labels.notifications}
            aria-label={labels.notifications}
            onClick={() => openDrawer("notifications")}
          >
            <i className="ph ph-bell"></i>
          </button>
          <button
            className="vxh-icon"
            title={labels.settings}
            aria-label={labels.settings}
            onClick={() => onNavigate("/settings")}
          >
            <i className="ph ph-gear-six"></i>
          </button>
        </div>

        <div className="vxh-pop-anchor">
          <button
            className="vxh-user"
            title={labels.userMenu}
            aria-label={labels.userMenu}
            onClick={() => toggle("user")}
          >
            <UserAvatar
              className="vxh-avatar"
              src={user?.picture ?? null}
              alt={displayName}
            />
            <span className="vxh-user-status"></span>
          </button>
          {panel === "user" && (
            <div className="vxh-panel vxh-user-panel">
              <div className="vxh-user-head">
                <UserAvatar
                  className="vxh-avatar xl"
                  src={user?.picture ?? null}
                  alt={displayName}
                />
                <div className="vxh-user-meta">
                  <div className="vxh-user-name">
                    {displayName}
                    <span className="vxh-verify">
                      <i className="ph-fill ph-seal-question"></i>
                      {t("verifyUnknown")}
                    </span>
                  </div>
                  <div className="vxh-user-contacts">
                    <span
                      className={
                        "vxh-user-contact" + (userPhone ? "" : " is-missing")
                      }
                    >
                      {userPhone || t("missingPhone")}
                    </span>
                    <span
                      className={
                        "vxh-user-contact" + (userEmail ? "" : " is-missing")
                      }
                    >
                      {userEmail || t("missingEmail")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="vxh-level-row">
                <i className="ph ph-medal vxh-level-lead"></i>
                <span className="vxh-lvslots">
                  {[
                    {
                      name:
                        t("slotRole") + " · " + (roleLabel || lv?.name || ""),
                      icon: "ph-users",
                      cls: "slot-role",
                      filled: true,
                    },
                    {
                      name:
                        t("slotLevel") +
                        " · L" +
                        String(userLevel).padStart(2, "0"),
                      icon: "ph-star",
                      cls: "slot-level",
                      filled: true,
                    },
                    {
                      name: t("slotLocked"),
                      icon: "ph-medal",
                      cls: "",
                      filled: false,
                    },
                    {
                      name: t("slotLocked"),
                      icon: "ph-medal",
                      cls: "",
                      filled: false,
                    },
                  ].map((s, i) => (
                    <span
                      key={i}
                      className={
                        "vxh-lvslot" + (s.filled ? " is-earned " + s.cls : "")
                      }
                      title={s.name}
                    >
                      <i className={"ph-fill " + s.icon}></i>
                    </span>
                  ))}
                </span>
              </div>

              <div className="vxh-acct-div"></div>

              <div className="vxh-acct-block">
                <button
                  className="vxh-acct-row"
                  onClick={() => {
                    setPanel(null);
                    setView("console");
                    onNavigate("/profile");
                  }}
                >
                  <i className="ph ph-user"></i>
                  <span className="vxh-acct-label">{labels.userMenu}</span>
                  <i className="ph ph-caret-right vxh-acct-go"></i>
                </button>
              </div>

              <div className="vxh-acct-div"></div>

              <div className="vxh-prefs">
                <div className="vxh-prefs-title">{labels.prefsTitle}</div>
                <div className="vxh-pref-row">
                  <i className="ph ph-globe vxh-pref-ico"></i>
                  <select
                    className="vxh-pref-select"
                    value={locale}
                    onChange={(e) => setLangPref(e.target.value as Locale)}
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
                <div className="vxh-pref-row">
                  <i className="ph ph-sun vxh-pref-ico"></i>
                  <div className="vxh-seg full">
                    <button
                      className={themePref === "system" ? "on" : ""}
                      onClick={() => setThemePref("system")}
                    >
                      {labels.themeSystem}
                    </button>
                    <button
                      className={themePref === "light" ? "on" : ""}
                      onClick={() => setThemePref("light")}
                    >
                      {labels.themeLight}
                    </button>
                    <button
                      className={themePref === "dark" ? "on" : ""}
                      onClick={() => setThemePref("dark")}
                    >
                      {labels.themeDark}
                    </button>
                  </div>
                </div>
                <div className="vxh-pref-row">
                  <i className="ph ph-rows vxh-pref-ico"></i>
                  <div className="vxh-seg full">
                    <button
                      className={density === "compact" ? "on" : ""}
                      onClick={() => setDensityPref("compact")}
                    >
                      {labels.densityCompact}
                    </button>
                    <button
                      className={density === "default" ? "on" : ""}
                      onClick={() => setDensityPref("default")}
                    >
                      {labels.densityDefault}
                    </button>
                    <button
                      className={density === "comfortable" ? "on" : ""}
                      onClick={() => setDensityPref("comfortable")}
                    >
                      {labels.densityComfy}
                    </button>
                  </div>
                </div>
                <div className="vxh-pref-row">
                  <i className="ph ph-text-aa vxh-pref-ico"></i>
                  <div className="vxh-seg full">
                    <button
                      className={fontSize === "small" ? "on" : ""}
                      onClick={() => setFontSize("small")}
                    >
                      {t("fontSmall")}
                    </button>
                    <button
                      className={fontSize === "default" ? "on" : ""}
                      onClick={() => setFontSize("default")}
                    >
                      {t("fontDefault")}
                    </button>
                    <button
                      className={fontSize === "large" ? "on" : ""}
                      onClick={() => setFontSize("large")}
                    >
                      {t("fontLarge")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="vxh-acct-div"></div>

              <div className="vxh-user-actions">
                <button className="vxh-menu-item" onClick={switchUser}>
                  <i className="ph ph-user-switch"></i>
                  {labels.switchUser}
                </button>
                <button className="vxh-menu-item danger" onClick={logoutToHome}>
                  <i className="ph ph-sign-out"></i>
                  {labels.signOut}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {panel && (
        <div className="vxh-backdrop" onClick={() => setPanel(null)}></div>
      )}
    </header>
  );
}
