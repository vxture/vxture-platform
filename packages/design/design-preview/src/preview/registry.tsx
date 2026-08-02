"use client";

/**
 * registry.tsx - 组件清单与出处标注。
 * @package @vxture/design-preview
 *
 * 每件恰好两枚标签，组合起来分三类：
 *
 *   {shadcn}{origin}            纯上游——照上游结构，只把取值换成 T2，未改 API。
 *   {shadcn}{vxture}            部分定制——占上游的位置，但 prop、变体或整套 API 有我们的改动。
 *   {vxture}{component|patterns} 完全自建——上游没有这个件；第二枚说明它落在哪一层。
 *
 * 两枚一起看才说得清来历。Button 是纯上游；Toast 占的是上游的通知位，但 API
 * 整套是我们的（上游现行方案是 sonner，换过去要动产品侧 16 处）；ViewHeader
 * 则上游根本没有，是从产品重复里提炼出来的图案。
 *
 * 这份清单同时是统计卡的数据源——数字不手写，从这里算。
 */

import * as React from "react";
import {
  ActionMenu,
  Avatar,
  BUTTON_VARIANTS,
  AvatarFallback,
  Badge,
  Banner,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  Drawer,
  BulkActionBar,
  DataTable,
  DialogForm,
  EmptyState,
  FilterBar,
  MetricGrid,
  NativeSelect,
  Section,
  SectionHeader,
  SectionNav,
  SegmentedControl,
  SplitViewLayout,
  ViewLayout,
  ViewHeader,
  StatusBadge,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Input,
  Label,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from "@vxture/design-system";
import {
  AuthLoginTemplate,
  AuthPasswordLoginPanel,
  ShellBrand,
  ShellIconButton,
  ShellLegalFooter,
  ShellLocaleSwitcher,
  ShellPreferencePanel,
  ShellThemeToggle,
  ShellUserMenu,
} from "@vxture/design-system";
import { PendingNote, Row } from "./kit";

export type Provenance =
  | "shadcn"
  | "origin"
  | "vxture"
  | "component"
  | "patterns"
  /** 尚未重写、且去向是删除或迁出的件。渲染无样式是预期结果。 */
  | "pending";

/**
 * 粒度，决定进哪个大类页面。**显式标注，不从出处标签推**——标签说的是"谁做的"
 * （上游 / 我们改的 / 我们建的），跟"它是不是原子件"是两回事：`NativeSelect` 是我们
 * 建的，但它就是一个控件；`Card` 来自上游，却是一组部件。
 *
 * 判据：`atom` = 一个控件、一个交互单元、没有子件 API；`pattern` = 由多个部件或多个
 * 控件拼成（含所有 `X.Part` 形态的件）；`pending` = 尚未重写。
 */
export type Layer = "atom" | "pattern" | "pending";

export interface Entry {
  readonly name: string;
  readonly group: string;
  readonly layer: Layer;
  /** 恰好两枚，见文件头的三类。 */
  readonly tags: readonly [Provenance, Provenance];
  /** 定制了什么。只有 vxture 类需要写。 */
  readonly deviation?: string;
  /** 待删 / 待迁出，不计入统计卡的"已完成"。 */
  readonly pending?: boolean;
  readonly render: () => React.ReactNode;
}

/**
 * 组件页内部的分组顺序。大类见 `./sections`——那一层决定进哪个页面，这一层只决定
 * 在页面里的先后。
 */
export const GROUPS = ["表单", "展示", "导航", "浮层", "反馈", "图案"] as const;

export const ENTRIES: readonly Entry[] = [
  /* ── 表单 ───────────────────────────────────────────────── */
  {
    name: "Button",
    layer: "atom",
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <>
        {BUTTON_VARIANTS.map((v) => (
          <Row key={v} label={v}>
            <Button variant={v} size="xs">
              最小
            </Button>
            <Button variant={v} size="sm">
              小
            </Button>
            <Button variant={v}>默认</Button>
            <Button variant={v} size="lg">
              大
            </Button>
            <Button variant={v} disabled>
              禁用
            </Button>
            <Button variant={v} size="icon" aria-label="图标">
              <Icon name="plus" size={16} />
            </Button>
          </Row>
        ))}
      </>
    ),
  },
  {
    name: "Input",
    layer: "atom",
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <div className="flex w-full max-w-content-base-xl flex-col gap-md">
        <Input placeholder="默认" />
        <Input defaultValue="有值" />
        <Input aria-invalid defaultValue="失效态（aria-invalid 驱动）" />
        <Input disabled defaultValue="禁用" />
        <Input type="file" />
      </div>
    ),
  },
  {
    name: "Textarea",
    layer: "atom",
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <div className="flex w-full max-w-content-base-xl flex-col gap-md">
        <Textarea placeholder="默认（field-sizing 随内容增高）" />
        <Textarea aria-invalid defaultValue="失效态" />
        <Textarea disabled defaultValue="禁用" />
      </div>
    ),
  },
  {
    name: "Label",
    layer: "atom",
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <Label htmlFor="r-label">字段名</Label>
        <Input
          id="r-label"
          className="max-w-media-2xl"
          placeholder="关联控件"
        />
      </Row>
    ),
  },
  {
    name: "Checkbox",
    layer: "atom",
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <span className="flex items-center gap-xs">
          <Checkbox id="r-cb1" defaultChecked />
          <Label htmlFor="r-cb1">已选中</Label>
        </span>
        <span className="flex items-center gap-xs">
          <Checkbox id="r-cb2" />
          <Label htmlFor="r-cb2">未选中</Label>
        </span>
        <span className="flex items-center gap-xs">
          <Checkbox id="r-cb3" disabled defaultChecked />
          <Label htmlFor="r-cb3">禁用</Label>
        </span>
      </Row>
    ),
  },
  {
    name: "Switch",
    layer: "atom",
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <span className="flex items-center gap-xs">
          <Switch id="r-sw1" defaultChecked />
          <Label htmlFor="r-sw1">开</Label>
        </span>
        <span className="flex items-center gap-xs">
          <Switch id="r-sw2" />
          <Label htmlFor="r-sw2">关</Label>
        </span>
        <span className="flex items-center gap-xs">
          <Switch id="r-sw3" disabled defaultChecked />
          <Label htmlFor="r-sw3">禁用</Label>
        </span>
      </Row>
    ),
  },
  {
    name: "Select",
    layer: "atom",
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <Select>
          <SelectTrigger className="w-media-2xl">
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">选项 A</SelectItem>
            <SelectItem value="b">选项 B</SelectItem>
            <SelectItem value="c">选项 C</SelectItem>
          </SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="w-media-2xl">
            <SelectValue placeholder="禁用" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </Row>
    ),
  },

  {
    name: "NativeSelect",
    layer: "atom",
    group: "表单",
    tags: ["vxture", "component"],
    deviation:
      "与 Radix 的 Select 并存：那件把列表渲染进 portal，拿不到移动端系统选择器与表单原生提交。尺度与焦点表现对齐 Input，箭头自绘（原生箭头不跟随主题）",
    render: () => (
      <div className="flex w-full max-w-content-base-xl flex-col gap-md">
        <NativeSelect defaultValue="b">
          <option value="a">选项 A</option>
          <option value="b">选项 B</option>
          <option value="c">选项 C</option>
        </NativeSelect>
        <NativeSelect aria-invalid defaultValue="a">
          <option value="a">失效态</option>
        </NativeSelect>
        <NativeSelect disabled defaultValue="a">
          <option value="a">禁用</option>
        </NativeSelect>
      </div>
    ),
  },
  {
    name: "SegmentedControl",
    layer: "atom",
    group: "表单",
    tags: ["vxture", "patterns"],
    deviation:
      "取代 PageSizePicker 与 ViewModeSwitch——两者形状相同，只是一个装数字一个装图标。语义用 radiogroup；选中态由本件画，不再靠调用方挂 .is-active",
    render: () => <SegmentedControlDemo />,
  },

  /* ── 展示 ───────────────────────────────────────────────── */
  {
    name: "Badge",
    layer: "atom",
    group: "展示",
    tags: ["shadcn", "vxture"],
    deviation:
      "增 asChild（可渲染为 <a>）；保留 forwardRef，上游面向 React 19 已去掉",
    render: () => (
      <Row>
        {(["default", "secondary", "destructive", "outline"] as const).map(
          (v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ),
        )}
        <Badge asChild>
          <a href="#badge">asChild 链接</a>
        </Badge>
      </Row>
    ),
  },
  {
    name: "Card",
    layer: "pattern",
    group: "展示",
    tags: ["shadcn", "origin"],
    render: () => (
      <Card className="w-full max-w-content-base-xl">
        <CardHeader>
          <CardTitle>卡片标题</CardTitle>
          <CardDescription>描述文字，用 body-sm 与弱化前景色。</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-muted-foreground">
            卡片边缘用 ring 而非 border：ring
            不占布局，且叠在阴影之上不与它相争。
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline">取消</Button>
          <Button>确定</Button>
        </CardFooter>
      </Card>
    ),
  },
  {
    name: "Avatar",
    layer: "atom",
    group: "展示",
    tags: ["shadcn", "vxture"],
    deviation: "增 AvatarSilhouette 与 UserAvatar 两件（平台头像的兜底形态）",
    render: () => (
      <Row>
        <Avatar>
          <AvatarFallback>VX</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>运维</AvatarFallback>
        </Avatar>
      </Row>
    ),
  },
  {
    name: "Separator",
    layer: "atom",
    group: "展示",
    tags: ["shadcn", "origin"],
    render: () => (
      <div className="flex w-full max-w-content-base-xl flex-col gap-md">
        <Separator />
        <div className="flex h-media-xs items-center gap-md">
          <span className="text-body-sm">左</span>
          <Separator orientation="vertical" />
          <span className="text-body-sm">右</span>
        </div>
      </div>
    ),
  },
  {
    name: "Skeleton",
    layer: "atom",
    group: "展示",
    tags: ["shadcn", "vxture"],
    deviation:
      "增 variant（line / rect / circle）与 lines——多行文本占位是列表页最常见形态",
    render: () => (
      <div className="flex w-full max-w-content-base-xl flex-col gap-md">
        <Skeleton lines={3} />
        <Skeleton variant="rect" height={80} />
        <Skeleton variant="circle" />
      </div>
    ),
  },

  /* ── 导航 ───────────────────────────────────────────────── */
  {
    name: "Tabs",
    layer: "pattern",
    group: "导航",
    tags: ["shadcn", "origin"],
    render: () => (
      <Tabs defaultValue="a" className="w-full max-w-content-base-xl">
        <TabsList>
          <TabsTrigger value="a">概览</TabsTrigger>
          <TabsTrigger value="b">配额</TabsTrigger>
          <TabsTrigger value="c" disabled>
            禁用
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a">
          <p className="text-body-sm text-muted-foreground">概览内容。</p>
        </TabsContent>
        <TabsContent value="b">
          <p className="text-body-sm text-muted-foreground">配额内容。</p>
        </TabsContent>
      </Tabs>
    ),
  },
  {
    name: "Breadcrumb",
    layer: "pattern",
    group: "导航",
    tags: ["shadcn", "origin"],
    render: () => (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">控制台</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">能力模块</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>模型接入</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  },
  {
    name: "Pagination",
    layer: "pattern",
    group: "导航",
    tags: ["shadcn", "vxture"],
    deviation:
      "整套 API 自有：上游是 <a href> 组合件（URL 驱动），工作台全是受控回调",
    render: () => <PaginationDemo />,
  },

  /* ── 浮层 ───────────────────────────────────────────────── */
  {
    name: "Dialog",
    layer: "pattern",
    group: "浮层",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">打开 Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认操作</DialogTitle>
              <DialogDescription>
                这个动作会影响所有已挂载的能力模块。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">取消</Button>
              <Button variant="destructive">确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Row>
    ),
  },
  {
    name: "Drawer",
    layer: "pattern",
    group: "浮层",
    tags: ["shadcn", "vxture"],
    deviation:
      "对应上游 Sheet（非其 vaul 版 Drawer）；受控便捷式 API 而非组合式——页眉页脚结构固定",
    render: () => <DrawerDemo />,
  },
  {
    name: "DropdownMenu",
    layer: "pattern",
    group: "浮层",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">下拉菜单</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>编辑</DropdownMenuItem>
            <DropdownMenuItem>复制</DropdownMenuItem>
            <DropdownMenuItem disabled>禁用项</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
    ),
  },
  {
    name: "Popover",
    layer: "pattern",
    group: "浮层",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p className="text-body-sm text-foreground">
              定位与碰撞处理由 Radix 承担。
            </p>
          </PopoverContent>
        </Popover>
      </Row>
    ),
  },
  {
    name: "Tooltip",
    layer: "atom",
    group: "浮层",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">悬停看提示</Button>
          </TooltipTrigger>
          <TooltipContent>提示文本</TooltipContent>
        </Tooltip>
      </Row>
    ),
  },

  /* ── 反馈 ───────────────────────────────────────────────── */
  {
    name: "Toast",
    layer: "pattern",
    group: "反馈",
    tags: ["shadcn", "vxture"],
    deviation:
      "整套 API 自有：上游现行方案是 sonner，迁移要动产品侧 16 处 useToast，需单独立项",
    render: () => <ToastDemo />,
  },

  {
    name: "Banner",
    layer: "pattern",
    group: "反馈",
    tags: ["vxture", "patterns"],
    deviation:
      "与 Toast 分工：Toast 说刚才那一下成了没有，说完就走；Banner 说这个页面现在处于什么状态，状态还在就一直在。tone 改用共用的六档语气（原为含 ai 的自有五值），图标由语气决定",
    render: () => <BannerDemo />,
  },

  /* ── 图案（完全自建）─────────────────────────────────────── */
  {
    name: "ViewHeader",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "产品扫描出现频次第一（72 处文件）。删了 5 个 *ClassName 逃生口与 actions 别名——逃生口会把页头内部 DOM 变成公开契约",
    render: () => (
      <ViewHeader
        className="w-full"
        icon="squares-four"
        eyebrow="ATLAS"
        title="模型接入"
        description="管理供给方、配额与调用审计。"
        secondary={<StatusBadge tone="success">运行中</StatusBadge>}
        action={
          <>
            <Button variant="outline">导出</Button>
            <Button>新建</Button>
          </>
        }
      />
    ),
  },
  {
    name: "StatusBadge",
    layer: "atom",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "在 Badge 之上加语气与圆点。tone 只表达严重度，没有 overdue / suspended 这类业务值",
    render: () => (
      <>
        <Row label="六种语气">
          {(
            [
              "neutral",
              "brand",
              "info",
              "success",
              "warning",
              "danger",
            ] as const
          ).map((t) => (
            <StatusBadge key={t} tone={t}>
              {t}
            </StatusBadge>
          ))}
        </Row>
        <Row label="带圆点（密集列表里不靠颜色也能分辨）">
          {(
            [
              "neutral",
              "brand",
              "info",
              "success",
              "warning",
              "danger",
            ] as const
          ).map((t) => (
            <StatusBadge key={t} tone={t} dot>
              {t}
            </StatusBadge>
          ))}
        </Row>
      </>
    ),
  },
  {
    name: "EmptyState",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "只加了 icon——空态图标是固定构成，不给就等于让每个产品在外面套一层自己的 div",
    render: () => (
      <>
        <EmptyState
          className="w-full"
          icon="list"
          title="还没有任何记录"
          description="创建第一条记录后，这里会显示它的状态与最近变更。"
          action={<Button>新建</Button>}
        />
        <EmptyState className="w-full" title="无图标形态" />
      </>
    ),
  },
  {
    name: "结构件族",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "ViewHeader / SectionHeader(level 1–4) / Section / ViewLayout / SplitViewLayout 是一族，层级与间距节奏一次定齐",
    render: () => (
      <ViewLayout className="w-full rounded-lg border border-dashed border-border p-lg">
        <SectionHeader level={1} title="一级标题（h1 · heading-2）" />
        <SectionHeader
          level={2}
          icon="database"
          title="二级标题（h2 · heading-3）"
          description="板块标题区，可带板块级动作。"
          action={<Button variant="outline">板块动作</Button>}
        />
        <Section
          title="Section · default"
          description="不托起，靠留白与标题分层。绝大多数板块用这个。"
        >
          <p className="text-body-sm text-muted-foreground">板块内容。</p>
        </Section>
        <Section
          tone="raised"
          level={3}
          title="Section · raised（h3 · heading-4）"
          description="描边 + 卡片底色，用于需要与周围明确切开的块。"
          action={<Button variant="destructive">危险操作</Button>}
        >
          <p className="text-body-sm text-muted-foreground">
            raised 对应视觉高度阶梯那一档，不叫
            muted——后者在色彩语义里已表示弱化。
          </p>
        </Section>
        <SectionHeader level={4} title="四级标题（h4 · heading-5）" />
      </ViewLayout>
    ),
  },
  {
    name: "SplitViewLayout",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "原名 SettingsSplitPage。Settings 是场景，这件表达的是形状；窄屏塌成单列",
    render: () => (
      <SplitViewLayout
        className="w-full rounded-lg border border-dashed border-border p-lg"
        navigation={
          <div className="flex flex-col gap-2xs rounded-md border border-border p-sm">
            <span className="text-label-sm text-foreground">导航项一</span>
            <span className="text-body-sm text-muted-foreground">导航项二</span>
            <span className="text-body-sm text-muted-foreground">导航项三</span>
          </div>
        }
        content={
          <Section
            title="右侧内容"
            description="min-w-0 flex-1，不被导航挤压。"
          >
            <p className="text-body-sm text-muted-foreground">内容区。</p>
          </Section>
        }
      />
    ),
  },
  {
    name: "SectionNav",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "SplitViewLayout 的左栏。条目是左对齐两行块，不复用 Button——后者是单行居中控件，套上去要一串 className 把布局全覆盖掉",
    render: () => <SectionNavDemo />,
  },
  {
    name: "FilterBar",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "只管筛选控件与右侧动作。删了 title / description——板块标题只由 SectionHeader 一处产出",
    render: () => (
      <FilterBar
        className="w-full"
        actions={
          <>
            <Button variant="outline">导出</Button>
            <Button>新建</Button>
          </>
        }
      >
        <Input className="w-56" placeholder="搜索名称…" />
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">运行中</SelectItem>
            <SelectItem value="paused">已暂停</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>
    ),
  },
  {
    name: "ActionMenu",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "数据驱动，只收 items。icon 收为 IconName 而非 ReactNode——传 node 等于把图标尺寸与颜色的决定权交回调用方",
    render: () => (
      <Row label="触发器形态、危险项配色、分隔位置都由本件固定">
        <ActionMenu
          items={[
            { id: "edit", label: "编辑", icon: "edit" },
            { id: "copy", label: "复制", icon: "copy" },
            { id: "lock", label: "已锁定", icon: "key", disabled: true },
            {
              id: "delete",
              label: "删除",
              icon: "trash",
              danger: true,
              separatorBefore: true,
            },
          ]}
        />
      </Row>
    ),
  },
  {
    name: "BulkActionBar",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "count 为 0 时返回 null——它只在有选中项时存在。删了 primaryActions：无选中时也显示的动作属于 FilterBar",
    render: () => <BulkActionBarDemo />,
  },
  {
    name: "DataTable",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "三态一次定齐：加载出骨架行（撑住高度不让页面跳）、空态出 EmptyState、有数据出行。选择态受控于 selectedKeys，与 BulkActionBar 对接；表头半选走 indeterminate。删了三个列级 *ClassName 与 getRowClassName",
    render: () => <DataTableDemo />,
  },
  {
    name: "MetricGrid / MetricCard",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "读数用 display-xs 而非 heading-2：同一字号，但指标值不是标题。删了 tone 的 default / positive 两个别名——同一语气两个名字迟早对不上",
    render: () => (
      <MetricGrid
        className="w-full"
        items={[
          {
            id: "calls",
            label: "调用总数",
            value: "1,284,930",
            icon: "graph",
            description: "近 30 天",
            trend: "+12.4%",
            trendTone: "success",
          },
          {
            id: "tokens",
            label: "消耗 token",
            value: "8.42 亿",
            icon: "database",
            trend: "+3.1%",
            trendTone: "neutral",
          },
          {
            id: "latency",
            label: "P95 时延",
            value: "412 ms",
            icon: "clock",
            trend: "+86 ms",
            trendTone: "warning",
          },
          {
            id: "errors",
            label: "错误率",
            value: "0.37%",
            icon: "error",
            trend: "超出阈值",
            trendTone: "danger",
          },
        ]}
      />
    ),
  },
  {
    name: "DialogForm",
    layer: "pattern",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "页脚由 props 描述而非 markup 槽，danger 一个开关覆盖常规/危险两种提交。字段区仍是 children——表单字段是业务形状",
    render: () => <DialogFormDemo />,
  },

  /* ── 待删（尚未重写，渲染无样式是预期结果）──────────────── */
  {
    name: "ShellChrome",
    layer: "pending",
    group: "外壳与登录",
    tags: ["vxture", "pending"],
    pending: true,
    deviation:
      "856 行，website 的 Header 在用其中三件。整份仍挂 .vx-shell-* 遗留类名。八个导出件全部摆在这里，供判断有无值得并入 WorkbenchShell 的部分",
    render: () => <ShellChromeDemo />,
  },
  {
    name: "AuthLogin",
    layer: "pending",
    group: "外壳与登录",
    tags: ["vxture", "pending"],
    pending: true,
    deviation:
      "1,742 行，accounts 有 6 个文件在用。整份仍挂 .vx-auth-* 遗留类名。这里摆的是最常用的一条组合：AuthLoginTemplate + AuthPasswordLoginPanel",
    render: () => <AuthLoginDemo />,
  },
];

/* 需要局部状态的几件单独成组件——registry 本身保持成数据。 */

function ShellChromeDemo() {
  const [locale, setLocale] = React.useState<"zh-CN" | "en-US">("zh-CN");
  const [theme, setTheme] = React.useState<"light" | "dark" | "system">(
    "light",
  );
  return (
    <div className="flex max-h-screen w-full flex-col gap-md overflow-auto">
      <PendingNote />
      <Row label="ShellBrand">
        <ShellBrand label="Vxture" />
      </Row>
      <Row label="ShellIconButton（默认 / 激活 / 禁用）">
        <ShellIconButton icon="bell" label="通知" />
        <ShellIconButton icon="search" label="搜索" active />
        <ShellIconButton icon="settings" label="设置" disabled />
      </Row>
      <Row label="ShellThemeToggle / ShellLocaleSwitcher">
        <ShellThemeToggle
          currentTheme={theme === "dark" ? "dark" : "light"}
          onThemeChange={(next) => setTheme(next)}
        />
        <ShellLocaleSwitcher
          currentLocale={locale}
          onLocaleChange={(next) => setLocale(next as "zh-CN" | "en-US")}
        />
      </Row>
      <Row label="ShellUserMenu" stack>
        <ShellUserMenu
          user={{
            displayName: "郭衍浩",
            uniqueLine: "@yanhao",
            avatarFallback: "郭",
            statusTag: { label: "已认证", verified: true },
            badges: [{ key: "lv", label: "Lv.4" }],
          }}
          links={[{ key: "profile", label: "个人信息", href: "#profile" }]}
          actions={[{ key: "logout", label: "退出登录", onClick: () => {} }]}
        />
      </Row>
      <Row label="ShellPreferencePanel" stack>
        <ShellPreferencePanel
          locale={locale}
          theme={theme}
          density="default"
          fontSize="default"
          onLocaleChange={(next) => setLocale(next as "zh-CN" | "en-US")}
          onThemeChange={(next) => setTheme(next)}
        />
      </Row>
      <Row label="ShellLegalFooter" stack>
        <ShellLegalFooter
          copyright="© 2026 Vxture"
          links={[
            { href: "#terms", label: "服务条款" },
            { href: "#privacy", label: "隐私政策" },
          ]}
        />
      </Row>
    </div>
  );
}

function AuthLoginDemo() {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  return (
    <div className="flex w-full flex-col gap-md">
      <PendingNote />
      {/* 关进一个带自身滚动的框里。无样式的件会把装饰元素放大到几千像素——
          AuthLogin 那把锁就把整页顶没了。框不掩盖坏，只是不让它波及别的条目。 */}
      <div className="max-h-screen w-full overflow-auto rounded-lg border border-dashed border-border">
        <AuthLoginTemplate
          title="欢迎回来"
          visual={{
            title: "Vxture 平台",
            description: "一个账号，贯通全部工作台。",
            statusText: "服务正常",
            stats: [
              { value: "99.9%", label: "可用性" },
              { value: "12ms", label: "中位时延" },
            ],
          }}
        >
          <AuthPasswordLoginPanel
            identifier={identifier}
            password={password}
            agreementChecked={agreed}
            loading={false}
            onChangeIdentifier={setIdentifier}
            onChangePassword={setPassword}
            onAgreementChange={setAgreed}
            onSubmit={(e) => e.preventDefault()}
          />
        </AuthLoginTemplate>
      </div>
    </div>
  );
}

const TONES = [
  "neutral",
  "brand",
  "info",
  "success",
  "warning",
  "danger",
] as const;

function BannerDemo() {
  const [dismissed, setDismissed] = React.useState(false);
  return (
    <div className="flex w-full flex-col gap-sm">
      {TONES.map((tone) => (
        <Banner
          key={tone}
          tone={tone}
          title={`${tone} 语气的常驻提示`}
          description="图标由语气决定，调用方不传——同一语气在各处配不同的图就散了。"
        />
      ))}
      <Banner
        tone="warning"
        title="带动作与关闭"
        description="onDismiss 给了才出现关闭按钮：不是所有状态都允许用户自行消掉。"
        action={<Button variant="outline">去处理</Button>}
        {...(dismissed ? {} : { onDismiss: () => setDismissed(true) })}
      />
      {dismissed ? (
        <Button variant="ghost" size="sm" onClick={() => setDismissed(false)}>
          恢复关闭按钮
        </Button>
      ) : null}
    </div>
  );
}

interface DemoRow {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly calls: number;
  readonly tone: (typeof TONES)[number];
  readonly status: string;
}

const DEMO_ROWS: readonly DemoRow[] = [
  {
    id: "r1",
    name: "主力推理通道",
    owner: "平台运维",
    calls: 128493,
    tone: "success",
    status: "运行中",
  },
  {
    id: "r2",
    name: "批处理通道",
    owner: "数据组",
    calls: 20418,
    tone: "warning",
    status: "配额将满",
  },
  {
    id: "r3",
    name: "灰度通道",
    owner: "模型组",
    calls: 912,
    tone: "neutral",
    status: "已暂停",
  },
];

function DataTableDemo() {
  const [sort, setSort] = React.useState({
    columnId: "calls",
    direction: "desc" as "asc" | "desc",
  });
  const [selected, setSelected] = React.useState<readonly string[]>(["r1"]);
  const [state, setState] = React.useState<"data" | "loading" | "empty">(
    "data",
  );

  const rows =
    state === "data"
      ? [...DEMO_ROWS].sort((a, b) =>
          sort.direction === "asc" ? a.calls - b.calls : b.calls - a.calls,
        )
      : [];

  return (
    <div className="flex w-full flex-col gap-sm">
      <SegmentedControl
        size="sm"
        ariaLabel="表格状态"
        value={state}
        onChange={setState}
        items={[
          { value: "data", label: "有数据" },
          { value: "loading", label: "加载中" },
          { value: "empty", label: "空态" },
        ]}
      />
      <BulkActionBar
        count={selected.length}
        onClear={() => setSelected([])}
        actions={[
          { id: "export", label: "导出", icon: "arrow-down" },
          { id: "delete", label: "删除", icon: "trash", danger: true },
        ]}
      />
      <DataTable<DemoRow>
        rows={rows}
        rowKey={(row) => row.id}
        loading={state === "loading"}
        emptyTitle="还没有任何通道"
        emptyDescription="创建第一条通道后，这里会显示它的调用量与状态。"
        emptyAction={<Button>新建通道</Button>}
        sort={sort}
        onSortChange={setSort}
        selectedKeys={selected}
        onSelectionChange={setSelected}
        columns={[
          { id: "name", header: "名称", cell: (row) => row.name },
          { id: "owner", header: "归属", cell: (row) => row.owner },
          {
            id: "calls",
            header: "调用量",
            align: "right",
            sortable: true,
            cell: (row) => row.calls.toLocaleString("zh-CN"),
          },
          {
            id: "status",
            header: "状态",
            cell: (row) => (
              <StatusBadge tone={row.tone}>{row.status}</StatusBadge>
            ),
          },
          {
            id: "actions",
            header: "",
            align: "right",
            cell: () => (
              <ActionMenu
                items={[
                  { id: "edit", label: "编辑", icon: "edit" },
                  {
                    id: "delete",
                    label: "删除",
                    icon: "trash",
                    danger: true,
                    separatorBefore: true,
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function SegmentedControlDemo() {
  const [size, setSize] = React.useState(20);
  const [mode, setMode] = React.useState<"list" | "cards">("list");
  const [view, setView] = React.useState<"list" | "cards" | "table">("cards");
  return (
    <>
      <Row label="每页条数（原 PageSizePicker）">
        <SegmentedControl
          size="sm"
          ariaLabel="每页条数"
          value={size}
          onChange={setSize}
          items={[10, 20, 50, 100].map((n) => ({
            value: n,
            label: String(n),
            ariaLabel: `每页 ${n} 条`,
          }))}
        />
      </Row>
      <Row label="展示方式（原 ViewModeSwitch）——只有图标时必须给 ariaLabel">
        <SegmentedControl
          ariaLabel="展示方式"
          value={mode}
          onChange={setMode}
          items={[
            { value: "list", icon: "list", ariaLabel: "列表" },
            { value: "cards", icon: "squares-four", ariaLabel: "卡片" },
          ]}
        />
      </Row>
      <Row label="图标 + 文字，含禁用项">
        <SegmentedControl
          value={view}
          onChange={setView}
          items={[
            { value: "list", icon: "list", label: "列表" },
            { value: "cards", icon: "squares-four", label: "卡片" },
            { value: "table", icon: "table", label: "表格", disabled: true },
          ]}
        />
      </Row>
    </>
  );
}

function SectionNavDemo() {
  const [active, setActive] = React.useState("profile");
  return (
    <SectionNav
      className="w-full max-w-content-narrow-lg"
      activeKey={active}
      onSelect={setActive}
      items={[
        {
          key: "profile",
          label: "基本信息",
          description: "名称、头像与联系方式",
        },
        {
          key: "security",
          label: "安全",
          description: "登录方式与二次验证",
          meta: <StatusBadge tone="warning">待完善</StatusBadge>,
        },
        { key: "billing", label: "账单", meta: <Badge>3</Badge> },
        { key: "audit", label: "审计日志", disabled: true },
      ]}
    />
  );
}

function BulkActionBarDemo() {
  const [count, setCount] = React.useState(3);
  return (
    <div className="flex w-full flex-col gap-sm">
      <Row label="count 归零后整条消失">
        <Button variant="outline" size="sm" onClick={() => setCount(3)}>
          选中 3 项
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCount(0)}>
          清空选中
        </Button>
      </Row>
      <BulkActionBar
        count={count}
        onClear={() => setCount(0)}
        actions={[
          { id: "export", label: "导出", icon: "arrow-down" },
          { id: "disable", label: "停用", icon: "stop" },
          { id: "delete", label: "删除", icon: "trash", danger: true },
        ]}
      />
    </div>
  );
}

function DialogFormDemo() {
  const [open, setOpen] = React.useState(false);
  const [danger, setDanger] = React.useState(false);
  return (
    <Row label="两种提交语气；提交中两侧按钮同时禁用">
      <Button
        variant="outline"
        onClick={() => {
          setDanger(false);
          setOpen(true);
        }}
      >
        常规提交
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setDanger(true);
          setOpen(true);
        }}
      >
        危险提交
      </Button>
      <DialogForm
        open={open}
        onOpenChange={setOpen}
        danger={danger}
        title={danger ? "删除模型接入" : "新建模型接入"}
        description={
          danger
            ? "删除后调用凭据立即失效，且不可恢复。"
            : "填写供给方与配额，保存后立即生效。"
        }
        submitLabel={danger ? "确认删除" : "保存"}
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      >
        <div className="flex flex-col gap-2xs">
          <Label htmlFor="preview-df-name">名称</Label>
          <Input id="preview-df-name" placeholder="例如：主力推理通道" />
        </div>
        <div className="flex flex-col gap-2xs">
          <Label htmlFor="preview-df-note">备注</Label>
          <Textarea id="preview-df-note" rows={3} />
        </div>
      </DialogForm>
    </Row>
  );
}

function PaginationDemo() {
  const [page, setPage] = React.useState(3);
  return (
    <Pagination
      className="w-full max-w-content-base-xl"
      page={page}
      pageCount={9}
      total={168}
      pageSize={20}
      onPageChange={setPage}
    />
  );
}

function DrawerDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <Row>
      <Button variant="outline" onClick={() => setOpen(true)}>
        打开 Drawer
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="模型详情"
        description="右侧滑出，Esc 或点击遮罩关闭。"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setOpen(false)}>保存</Button>
          </>
        }
      >
        <p className="text-body-sm text-muted-foreground">
          页眉页脚结构固定，内容区由 children 承担。
        </p>
      </Drawer>
    </Row>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <Row label="五种语气；error 用 assertive 播报，其余 polite">
      {(["success", "error", "warning", "info", "ai"] as const).map((tone) => (
        <Button
          key={tone}
          variant="outline"
          onClick={() =>
            toast({ tone, title: `${tone} 通知`, description: "示例通知。" })
          }
        >
          {tone}
        </Button>
      ))}
    </Row>
  );
}
