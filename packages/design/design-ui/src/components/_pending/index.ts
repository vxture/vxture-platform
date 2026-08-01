/**
 * components/_pending/index.ts - 待改造组件的临时归集。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Index
 *
 * ⚠ 这是一个**临时目录，会被清空并删除**。不要往里加新组件，也不要从产品侧
 *   按路径深引——公开入口仍是包根，本目录的存在对消费方不可见。
 *
 * 目录里的组件都还挂着已退役的遗留 BEM 类名，**当前渲染无样式**。按去向分两格：
 *
 * `patterns/` 里的件重写后迁入 `../patterns`。名单与优先级见
 * `workplans/design-system-t1-t4-refactor.md` C2 的执行清单。
 *
 * 每重写一件，就从 `scripts/guardrails/check-component-classes.mjs` 的 PENDING
 * 里摘掉一行——那份清单是本目录清空进度的唯一计数。
 */

export * from "./patterns/Banner";
export * from "./patterns/DataTable";
