/**
 * DS IconName → Phosphor 类名映射。Console templates 设计稿用 Phosphor 图标
 * (`ph ph-*`)；导航注册表用 DS IconName。Sidebar/Header 经此映射渲染。
 */
import type { IconName } from "@vxture/design-system";

const NAV_PH_ICON: Record<string, string> = {
  home: "ph-gauge",
  calendar: "ph-calendar-check",
  user: "ph-user",
  "building-library": "ph-buildings",
  users: "ph-users",
  "shield-check": "ph-shield-check",
  mail: "ph-envelope",
  "chart-bar": "ph-chart-bar",
  database: "ph-database",
  settings: "ph-gear-six",
  "squares-four": "ph-squares-four",
};

/** 功能域 id → Phosphor 类名（rail 域名旁、launcher 用）。 */
const DOMAIN_PH_ICON: Record<string, string> = {
  workspace: "ph-squares-four",
  org: "ph-buildings",
  billing: "ph-receipt",
  settings: "ph-gear-six",
  platform: "ph-stack",
};

export function phNavIcon(name: IconName | string): string {
  return NAV_PH_ICON[name as string] ?? "ph-circle";
}

export function phDomainIcon(id: string): string {
  return DOMAIN_PH_ICON[id] ?? "ph-squares-four";
}
