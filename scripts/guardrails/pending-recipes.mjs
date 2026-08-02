/**
 * pending-recipes.mjs — 尚未改用配方层的组件清单。
 *
 * 配方层（`design-ui/src/styles/recipes.ts`）把焦点环、禁用态、按压反馈这类
 * **跨组件恒定**的类名片段抽出来写一次。手写这些片段是漂移的来源：改基调时
 * 一定会漏掉几个，而漏掉不报错，只是那个组件从此和别人长得不一样。
 *
 * 本清单是**批 A 建立配方层时按当时现状实测生成的**，不是手抄。批 B–D 每改造完
 * 一个组件就从这里删一行，清空即可连同本文件一并删除。
 *
 * 守卫是双向的：清单外的组件手写这些片段会报错（挡新增漂移），清单内的组件
 * **已经不再手写**也会报错（挡清单腐烂）。
 */

export const PENDING_RECIPES = [
  // 批 B｜表单控件
  // 批 C｜容器叠层
  // 批 D｜导航状态
  "Badge.tsx",
  "SectionNav.tsx",
  "SegmentedControl.tsx",
  "Tabs.tsx",
  // 批 E｜数据展示
  "Banner.tsx",
  "DataTable.tsx",
];

/**
 * 判定"手写了本该由配方提供的片段"的模式。
 *
 * 只认这三类：焦点环、禁用态压暗、校验失败态。它们在每个组件里都该长一个样，
 * 且写错了不报错。间距、颜色这类各组件本就该不同的，不在此列。
 */
export const RECIPE_PATTERNS = [
  ["focus-visible:ring", "interactive"],
  ["disabled:opacity", "interactive"],
  ["aria-invalid:", "invalid"],
];
