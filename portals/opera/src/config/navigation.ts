/**
 * navigation.ts — Opera 导航注册表（业务配置，由产品侧组装）。
 *
 * 结构对应 docs/opera-top-level-design.md §9 菜单结构 + §10 Opera 1.0 范围：
 * Dashboard / Atlas / Observability / Security / Settings。
 * 图标一律取 DS iconDictionary 语义键（类型收窄为 IconName，写错编译期报）。
 *
 * 类型契约来自 DS 的 ShellSidebarNav（与业务无关的通用侧栏导航壳）而非反过来
 * ——本文件只负责菜单内容，侧栏组件本身不 import 这里的任何数据。
 */

import type { ShellNavItem, ShellNavSection } from "@vxture/design-system";

export interface OperaNavItem extends ShellNavItem {
  description?: string;
}

export interface OperaNavSection extends Omit<ShellNavSection, "items"> {
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
    title: "Runos · 能力服务",
    items: [
      {
        href: "/runos/plugins",
        label: "Plugin",
        icon: "package",
        description: "套件注册与依赖声明",
      },
      {
        href: "/runos/capabilities",
        label: "Capability",
        icon: "stack",
        description: "四原语统一注册台账",
      },
      {
        href: "/runos/endpoints",
        label: "Endpoint",
        icon: "plug",
        description: "端点登记（在 Capability 详情内管理）",
      },
      {
        href: "/runos/supply-catalogs",
        label: "Supply Catalog",
        icon: "list-checks",
        description: "opera 技术供给目录（两段裁决第一段）",
      },
      {
        href: "/runos/policies",
        label: "Policy",
        icon: "shield",
        description: "风险策略：read / write / critical",
      },
      {
        href: "/runos/credentials",
        label: "Credential",
        icon: "key",
        description: "第三方系统凭证托管",
      },
      {
        href: "/runos/quality-profiles",
        label: "Quality Profile",
        icon: "target",
        description: "质量评分与回归门禁",
      },
      {
        href: "/runos/audit",
        label: "Audit",
        icon: "clipboard",
        description: "运行面 / 管理面双审计事件流",
      },
    ],
  },
  {
    title: "ships · 产品发布",
    items: [
      {
        href: "/products",
        label: "产品目录",
        icon: "package",
        description: "产品基础设施登记（product.products）",
      },
    ],
  },
  {
    title: "trace · 运行监控",
    items: [
      {
        href: "/ops/maintenance-windows",
        label: "维护窗口",
        icon: "clock",
        description: "计划内停机与影响范围",
      },
      {
        href: "/ops/service-monitor",
        label: "服务监控",
        icon: "server",
        description: "接入产品的 prod / beta 存活状态",
      },
      {
        href: "/ops/job-scheduler",
        label: "任务调度",
        icon: "workflow",
        description: "后台作业心跳与 webhook 投递队列",
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
