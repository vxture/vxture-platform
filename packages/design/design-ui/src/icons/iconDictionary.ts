/**
 * iconDictionary.ts - 图标名称字典
 * @package @vxture/design-ui
 *
 * 功能：按用途分组定义全部图标，`iconDictionary` 与 `IconName` 均由分组推导
 *       新增图标：在此文件对应分组和 iconRegistry.ts 中同时添加
 *       命名规则：每个语义只保留一个规范 key，不设同义别名
 *
 * 分组是**数据不是注释**：图标选择器、预览面都要按组呈现，八十多个名字平铺出来
 * 找不到东西。写成注释就只有读源码的人看得见。
 *
 * @copyright Vxture Team
 * @layer Domain
 * @category Types
 */

export const ICON_GROUPS = [
  {
    label: "导航",
    icons: [
      "home",
      "arrow-left",
      "arrow-right",
      "arrow-left-right",
      "arrow-up",
      "arrow-down",
      "arrow-long-right",
      "chevron-left",
      "chevron-right",
      "chevron-up",
      "chevron-down",
      "caret-double-up",
      "caret-double-down",
      "caret-left-bold",
      "caret-right-bold",
      "squares-four",
    ],
  },
  {
    label: "操作",
    icons: [
      "search",
      "app-grid",
      "settings", // 齿轮/设置（原 cog 已合并）
      "help",
      "bell",
      "more-vertical",
      "edit",
      "key",
      "lock", // 密码/机密字段
      "eye", // 明文可见（密码可见性切换）
      "eye-slash", // 明文隐藏（密码可见性切换）
      "trash", // 删除（原 delete 已合并）
      "plus", // 新增（原 add 已合并）
      "minus", // 减少；复选框半选态的指示符
      "x",
      "check",
      "copy",
      "play",
      "stop",
      "text-indent",
      "text-outdent",
      "sign-out",
    ],
  },
  {
    label: "状态",
    icons: ["success", "error", "warning", "info"],
  },
  {
    label: "云服务与智能体",
    icons: [
      "agent",
      "workflow",
      "trigger",
      "database",
      "cloud",
      "plug",
      "server",
      "cube",
      "building-library",
    ],
  },
  {
    label: "数据与内容",
    icons: [
      "chart-bar", // 图表（原 chart 已合并）
      "table",
      "code",
      "api",
      "graph",
      "lightbulb",
      "sparkles",
      "shield-check",
    ],
  },
  {
    label: "用户与组织",
    icons: [
      "user",
      "role", // 角色/权限主体
      "user-switch",
      "buildings",
      "users", // 用户组（原 user-group 已合并）
      "medal",
      "star",
    ],
  },
  {
    label: "通讯与联系",
    icons: [
      "mail",
      "phone",
      "wechat",
      "github",
      "linkedin",
      "chat-circle",
      "paperplane-tilt",
    ],
  },
  {
    label: "时间与位置",
    icons: [
      "calendar", // 日历（原 calendar-days 已合并）
      "clock",
      "clock-counter-clockwise",
      "map-pin", // 地图标记（原 map-marker 已合并）
    ],
  },
  {
    label: "视图与主题",
    icons: [
      "sun",
      "moon",
      "globe",
      "corners-out", // 伪全屏展开
      "corners-in", // 伪全屏收起
      "maximize", // 原生全屏展开（ArrowsOutSimple）
      "minimize", // 原生全屏收起（ArrowsInSimple）
      "list", // 列表视图
      "rows", // 密度切换
    ],
  },
  {
    label: "系统保留",
    icons: ["placeholder"],
  },
] as const satisfies readonly {
  readonly label: string;
  readonly icons: readonly string[];
}[];

/**
 * 全部图标名称，按分组顺序摊平。
 *
 * 分组是唯一录入处——这里不再另写一份，两份清单迟早对不上。
 */
export const iconDictionary: readonly IconName[] = ICON_GROUPS.flatMap(
  (group) => group.icons,
);

/**
 * 图标名称类型
 *
 * 由 ICON_GROUPS 推导，新增图标需同时更新本文件与 iconRegistry.ts
 */
export type IconName = (typeof ICON_GROUPS)[number]["icons"][number];
