"use client";

/* 1:1 转写自设计稿 shell.jsx Header(.vxh)，admin 形态：
 *  - 第5位 = .vxh-active-menu（当前工作域名），非 console 的租户切换器；
 *  - launcher 弹层 = 顶层视图（管理工作域）切换；
 *  - 无租户 / 账单 / 配额面板。
 * 其余（launcher / 品牌 / 搜索 / 操作组 / 用户面板）与 console 完全一致。 */

import { useState } from "react";
import Image from "next/image";
import { UserAvatar, useTheme } from "@vxture/design-system";
import {
  setGlobalDensityPreference,
  setGlobalLocalePreference,
  setGlobalThemePreference,
} from "@vxture/platform-browser";
import type { Locale, Theme } from "@vxture/shared";
import { useAdminSession } from "@/features/session/AdminSessionProvider";
import { useConsoleLocale, useConsoleTranslations } from "@/lib/ConsoleIntl";
import type { ShellView } from "./shell/types";

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
  views: HeaderViewOption[];
  activeViewId: ShellView;
  onSelectView: (id: ShellView) => void;
  activeMenuName: string;
  velaOpen: boolean;
  setVelaOpen: (open: boolean) => void;
  showVela: boolean;
  openDrawer: (type: "notifications" | "settings") => void;
  onNavigate: (href: string) => void;
  onSwitchUser: () => void;
  onSignOut: () => void;
  brandName: string;
}

export function TemplateHeader({
  views,
  activeViewId,
  onSelectView,
  activeMenuName,
  velaOpen,
  setVelaOpen,
  showVela,
  openDrawer,
  onNavigate,
  onSwitchUser,
  onSignOut,
  brandName,
}: TemplateHeaderProps) {
  const { session } = useAdminSession();
  const locale = useConsoleLocale();
  const t = useConsoleTranslations("shell");
  const { theme, setTheme, density, setDensity } = useTheme();

  const [panel, setPanel] = useState<null | "launcher" | "user">(null);
  const [themePref, setThemePrefState] = useState<"system" | "light" | "dark">(
    theme === "dark" ? "dark" : theme === "light" ? "light" : "system",
  );
  const [fontSize, setFontSize] = useState<"small" | "default" | "large">(
    "default",
  );

  // 用户等级：暂无真实等级数据，按设计默认 fallback L01。
  const userLevel = 1;
  const lv = USER_LEVELS[userLevel];
  const toggle = (p: "launcher" | "user") =>
    setPanel((cur) => (cur === p ? null : p));

  const user = session.user;
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
            title={t("featureBoards", "功能板块")}
            aria-label={t("featureBoards", "功能板块")}
            onClick={() => toggle("launcher")}
          >
            <i className="ph ph-dots-nine"></i>
          </button>
          {panel === "launcher" && (
            <div className="vxh-panel vxh-launcher-panel">
              <div className="vxh-board-list">
                {views.map((v) => (
                  <button
                    key={v.id}
                    className={
                      "vxh-board" + (v.id === activeViewId ? " is-active" : "")
                    }
                    onClick={() => {
                      setPanel(null);
                      onSelectView(v.id);
                    }}
                  >
                    <span className="vxh-board-ico">
                      <i className={"ph " + v.icon}></i>
                    </span>
                    <span className="vxh-board-copy">
                      <strong>{v.name}</strong>
                      <span>{v.desc}</span>
                    </span>
                    {v.id === activeViewId && (
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

        {/* 当前激活视图名称（原租户切换器位置）*/}
        <span className="vxh-active-menu">
          <span>{activeMenuName}</span>
        </span>
      </div>

      {/* 搜索栏 */}
      <label className="vxh-search">
        <i className="ph ph-magnifying-glass"></i>
        <input
          type="search"
          placeholder={t("searchPlaceholder", "搜索租户、用户、订单、配置…")}
        />
        <kbd>⌘K</kbd>
      </label>

      {/* ── RIGHT ── */}
      <div className="vxh-actions">
        {showVela && (
          <button
            className={"vxh-agent" + (velaOpen ? " is-active" : "")}
            onClick={() => setVelaOpen(!velaOpen)}
            title={t("assistant", "Varda · 平台助手")}
            aria-label={t("assistant", "Varda · 平台助手")}
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

        <div
          className="vxh-group"
          role="group"
          aria-label={t("settings", "系统设置")}
        >
          <button
            className="vxh-icon"
            title={t("help", "帮助")}
            aria-label={t("help", "帮助")}
          >
            <i className="ph ph-question"></i>
          </button>
          <button
            className="vxh-icon"
            title={t("notifications", "告警通知")}
            aria-label={t("notifications", "告警通知")}
            onClick={() => openDrawer("notifications")}
          >
            <i className="ph ph-bell"></i>
          </button>
          <button
            className="vxh-icon"
            title={t("settings", "系统设置")}
            aria-label={t("settings", "系统设置")}
            onClick={() => onNavigate("/settings")}
          >
            <i className="ph ph-gear-six"></i>
          </button>
        </div>

        <div className="vxh-pop-anchor">
          <button
            className="vxh-user"
            title={t("userMenu", "用户菜单")}
            aria-label={t("userMenu", "用户菜单")}
            onClick={() => toggle("user")}
          >
            <UserAvatar className="vxh-avatar" src={null} alt={displayName} />
            <span className="vxh-user-status"></span>
          </button>
          {panel === "user" && (
            <div className="vxh-panel vxh-user-panel">
              <div className="vxh-user-head">
                <UserAvatar
                  className="vxh-avatar xl"
                  src={null}
                  alt={displayName}
                />
                <div className="vxh-user-meta">
                  <div className="vxh-user-name">
                    {displayName}
                    <span className="vxh-verify">
                      <i className="ph-fill ph-seal-question"></i>
                      {t("verifyUnknown", "未认证")}
                    </span>
                  </div>
                  <div className="vxh-user-contacts">
                    <span
                      className={
                        "vxh-user-contact" + (userPhone ? "" : " is-missing")
                      }
                    >
                      {userPhone || t("missingPhone", "缺少手机号")}
                    </span>
                    <span
                      className={
                        "vxh-user-contact" + (userEmail ? "" : " is-missing")
                      }
                    >
                      {userEmail || t("missingEmail", "缺少 email")}
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
                        t("slotRole", "角色") +
                        " · " +
                        (roleLabel || lv?.name || ""),
                      icon: "ph-users",
                      cls: "slot-role",
                      filled: true,
                    },
                    {
                      name:
                        t("slotLevel", "用户等级") +
                        " · L" +
                        String(userLevel).padStart(2, "0"),
                      icon: "ph-star",
                      cls: "slot-level",
                      filled: true,
                    },
                    {
                      name: t("slotLocked", "其他奖章 · 待解锁"),
                      icon: "ph-medal",
                      cls: "",
                      filled: false,
                    },
                    {
                      name: t("slotLocked", "其他奖章 · 待解锁"),
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
                    onNavigate("/platform-admins");
                  }}
                >
                  <i className="ph ph-user"></i>
                  <span className="vxh-acct-label">
                    {t("profile", "个人信息")}
                  </span>
                  <i className="ph ph-caret-right vxh-acct-go"></i>
                </button>
              </div>

              <div className="vxh-acct-div"></div>

              <div className="vxh-prefs">
                <div className="vxh-prefs-title">
                  {t("prefsTitle", "偏好设置")}
                </div>
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
                      {t("themeSystem", "跟随系统")}
                    </button>
                    <button
                      className={themePref === "light" ? "on" : ""}
                      onClick={() => setThemePref("light")}
                    >
                      {t("themeLight", "亮色")}
                    </button>
                    <button
                      className={themePref === "dark" ? "on" : ""}
                      onClick={() => setThemePref("dark")}
                    >
                      {t("themeDark", "暗色")}
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
                      {t("densityCompact", "紧凑")}
                    </button>
                    <button
                      className={density === "default" ? "on" : ""}
                      onClick={() => setDensityPref("default")}
                    >
                      {t("densityDefault", "默认")}
                    </button>
                    <button
                      className={density === "comfortable" ? "on" : ""}
                      onClick={() => setDensityPref("comfortable")}
                    >
                      {t("densityComfy", "宽松")}
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
                      {t("fontSmall", "小")}
                    </button>
                    <button
                      className={fontSize === "default" ? "on" : ""}
                      onClick={() => setFontSize("default")}
                    >
                      {t("fontDefault", "默认")}
                    </button>
                    <button
                      className={fontSize === "large" ? "on" : ""}
                      onClick={() => setFontSize("large")}
                    >
                      {t("fontLarge", "大")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="vxh-acct-div"></div>

              <div className="vxh-user-actions">
                <button
                  className="vxh-menu-item"
                  onClick={() => {
                    setPanel(null);
                    onSwitchUser();
                  }}
                >
                  <i className="ph ph-user-switch"></i>
                  {t("switchUser", "切换用户")}
                </button>
                <button
                  className="vxh-menu-item danger"
                  onClick={() => {
                    setPanel(null);
                    onSignOut();
                  }}
                >
                  <i className="ph ph-sign-out"></i>
                  {t("signOut", "退出登录")}
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
