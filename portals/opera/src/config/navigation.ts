/**
 * navigation.ts — Opera 导航注册表。
 *
 * 结构对应 docs/opera-top-level-design.md §9 菜单结构 + §10 Opera 1.0 范围：
 * Dashboard / Atlas / Observability / Security / Settings。
 * 图标一律取 DS iconDictionary 语义键（类型收窄为 IconName，写错编译期报）。
 */

import type { IconName } from "@vxture/design-system";

export interface OperaNavItem {
  href: string;
  label: string;
  icon: IconName;
  description?: string;
}

export interface OperaNavSection {
  title: string;
  items: OperaNavItem[];
}

export const operaNavSections: OperaNavSection[] = [
  {
    title: "总览",
    items: [{ href: "/", label: "Dashboard", icon: "squares-four" }],
  },
  {
    title: "Atlas · 模型服务",
    items: [
      {
        href: "/atlas/providers",
        label: "Provider",
        icon: "plugs-connected",
        description: "模型供应商接入与健康",
      },
      {
        href: "/atlas/models",
        label: "Model Registry",
        icon: "brain",
        description: "统一模型注册中心",
      },
      {
        href: "/atlas/endpoints",
        label: "Endpoint",
        icon: "plug",
        description: "统一能力入口",
      },
      {
        href: "/atlas/router",
        label: "Router",
        icon: "tree-structure",
        description: "模型路由：Primary / Fallback",
      },
      {
        href: "/atlas/keys",
        label: "API Key",
        icon: "key",
        description: "内外部调用密钥",
      },
      {
        href: "/atlas/metering",
        label: "Metering",
        icon: "gauge",
        description: "请求 / Token / 成本事实",
      },
    ],
  },
  {
    title: "Observability",
    items: [
      {
        href: "/observability/metrics",
        label: "Metrics",
        icon: "chart-line-up",
      },
      { href: "/observability/logs", label: "Logs", icon: "terminal" },
    ],
  },
  {
    title: "Security",
    items: [
      { href: "/security/rbac", label: "RBAC", icon: "role" },
      { href: "/security/audit", label: "Audit", icon: "clipboard" },
    ],
  },
  {
    title: "系统",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];
