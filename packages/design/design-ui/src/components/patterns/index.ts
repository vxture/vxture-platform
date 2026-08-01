/**
 * components/patterns/index.ts - 平台图案层导出入口。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Index
 *
 * 本目录放 **shadcn 上游没有** 的组合件。收录门槛是产品实据，不是设想：一个图案
 * 要进来，得先在 console / admin / opera 里被各自重写过（扫描结论见
 * `workplans/design-system-t1-t4-refactor.md` C2）。
 *
 * 两条硬边界：
 * 1. **零业务**。图案只认形状不认业务含义——`StatusBadge` 有 tone，没有
 *    "订阅已逾期"；`DataTable` 有列定义，没有"租户列表"。带业务归属的面板
 *    （UserPanel / TenantPanel 一类）不进本包，归 `@vxture/domain-ui`。
 * 2. **不带产品专名**（D16）。没有 console-* / admin-* / platform-* 前缀。
 *
 * 尚未重写的图案暂存 `../_pending/patterns`，逐件重写后迁入本目录。
 */

export * from "./ActionMenu";
export * from "./EmptyState";
export * from "./FilterBar";
export * from "./Section";
export * from "./SectionHeader";
export * from "./SectionNav";
export * from "./SplitViewLayout";
export * from "./ViewHeader";
export * from "./ViewLayout";
export * from "./StatusBadge";
