/**
 * DS IconName → Phosphor 类名映射。Admin templates 设计稿用 Phosphor 图标
 * (`ph ph-*`)；导航注册表用 DS IconName。Sidebar/Header/launcher 经此映射渲染。
 *
 * 覆盖 `config/navigation.ts` 中 adminWorkspaces 实际用到的图标集合。未命中
 * 回退 `ph-circle`（与 console icons-map 一致）。
 */
import type { IconName } from "@vxture/design-system";

const NAV_PH_ICON: Record<string, string> = {
  "squares-four": "ph-squares-four",
  table: "ph-table",
  buildings: "ph-buildings",
  user: "ph-user",
  medal: "ph-medal",
  database: "ph-database",
  workflow: "ph-flow-arrow",
  star: "ph-star",
  sparkles: "ph-sparkle",
  graph: "ph-graph",
  check: "ph-check-square",
  "chart-bar": "ph-chart-bar",
  "shield-check": "ph-shield-check",
  cube: "ph-cube",
  key: "ph-key",
  "chat-circle": "ph-chat-circle",
  bell: "ph-bell",
  role: "ph-user-gear",
  cloud: "ph-cloud",
  server: "ph-hard-drives",
  info: "ph-info",
  settings: "ph-gear-six",
  trigger: "ph-toggle-left",
  warning: "ph-warning",
  clock: "ph-clock",
};

export function phNavIcon(name: IconName | string): string {
  return NAV_PH_ICON[name as string] ?? "ph-circle";
}
