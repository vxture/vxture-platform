/**
 * components/base/index.ts - 基础组件层（单件）导出入口。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Index
 *
 * 判据一句话：**单件进 base，组合进 composite，零视觉纯排布进 layout，页面骨架进
 * templates**。"单件"看消费不看构造——StatusBadge / SegmentedControl 构造上是派生，
 * 消费上是一个控件，归这里。shadcn 上游有对应件的：结构照上游，取值绑 T2 语义层，
 * 需要定制的就地定制并在文件头注明偏离及理由。带业务属性的一律不进本包
 * （见 `packages/design/design-system/docs/03-patterns-guide.md` §8）。
 *
 * Drawer 对应上游的 **Sheet**；上游那个基于 vaul 的 Drawer 本仓无对应场景。
 */

export * from "./Accordion";
export * from "./AlertDialog";
export * from "./AspectRatio";
export * from "./Avatar";
export * from "./Badge";
export * from "./Banner";
export * from "./Breadcrumb";
export * from "./Button";
export * from "./ButtonGroup";
export * from "./Calendar";
export * from "./Card";
export * from "./Checkbox";
export * from "./Collapsible";
export * from "./Command";
export * from "./ContextMenu";
export * from "./Dialog";
export * from "./EmptyState";
export * from "./Drawer";
export * from "./DropdownMenu";
export * from "./Field";
export * from "./HoverCard";
export * from "./Input";
export * from "./InputGroup";
export * from "./InputOTP";
export * from "./Kbd";
export * from "./Label";
export * from "./NativeSelect";
export * from "./Pagination";
export * from "./Popover";
export * from "./Progress";
export * from "./RadioGroup";
export * from "./Resizable";
export * from "./ScrollArea";
export * from "./SegmentedControl";
export * from "./Select";
export * from "./Separator";
export * from "./Skeleton";
export * from "./Slider";
export * from "./Spinner";
export * from "./StatusBadge";
export * from "./Switch";
export * from "./Table";
export * from "./Tabs";
export * from "./Textarea";
export * from "./Toast";
export * from "./Toggle";
export * from "./ToggleGroup";
export * from "./Tooltip";
