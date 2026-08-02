/**
 * components/ui/index.ts - 基础组件层导出入口。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Index
 *
 * 本目录只放 **shadcn 上游有对应件** 的组件：结构照上游，取值绑 T2 语义层，
 * 需要定制的就地定制并在文件头注明偏离及理由。上游没有的组合件归 `../patterns`，
 * 带业务属性的一律不进本包（见 `docs/10-standards/060-design-system.md`）。
 *
 * Drawer 对应上游的 **Sheet**；上游那个基于 vaul 的 Drawer 本仓无对应场景。
 */

export * from "./Accordion";
export * from "./AlertDialog";
export * from "./AspectRatio";
export * from "./Avatar";
export * from "./Badge";
export * from "./Breadcrumb";
export * from "./Button";
// 值与类型都要导出：BUTTON_VARIANTS / BUTTON_SIZES 是运行时数组，
// 预览面与图案件遍历全部挡位时引它，避免各自手抄。
export * from "./Button.types";
export * from "./Calendar";
export * from "./Card";
export * from "./Checkbox";
export * from "./Collapsible";
export * from "./Command";
export * from "./ContextMenu";
export * from "./Dialog";
export * from "./Drawer";
export * from "./DropdownMenu";
export * from "./HoverCard";
export * from "./Input";
export * from "./Label";
export * from "./Pagination";
export * from "./Popover";
export * from "./Progress";
export * from "./RadioGroup";
export * from "./ScrollArea";
export * from "./Select";
export * from "./Separator";
export * from "./Skeleton";
export * from "./Slider";
export * from "./Switch";
export * from "./Table";
export * from "./Tabs";
export * from "./Textarea";
export * from "./Toast";
export * from "./Toggle";
export * from "./ToggleGroup";
export * from "./Tooltip";
