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
  AvatarFallback,
  Badge,
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
  DialogForm,
  EmptyState,
  FilterBar,
  Section,
  SectionHeader,
  SectionNav,
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
import { Row } from "./kit";

export type Provenance =
  | "shadcn"
  | "origin"
  | "vxture"
  | "component"
  | "patterns";

export interface Entry {
  readonly name: string;
  readonly group: string;
  /** 恰好两枚，见文件头的三类。 */
  readonly tags: readonly [Provenance, Provenance];
  /** 定制了什么。只有 vxture 类需要写。 */
  readonly deviation?: string;
  readonly render: () => React.ReactNode;
}

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

export const GROUPS = ["表单", "展示", "导航", "浮层", "反馈", "图案"] as const;

export const ENTRIES: readonly Entry[] = [
  /* ── 表单 ───────────────────────────────────────────────── */
  {
    name: "Button",
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <>
        {BUTTON_VARIANTS.map((v) => (
          <Row key={v} label={v}>
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
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <Label htmlFor="r-label">字段名</Label>
        <Input
          id="r-label"
          className="max-w-media-3xl"
          placeholder="关联控件"
        />
      </Row>
    ),
  },
  {
    name: "Checkbox",
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
    group: "表单",
    tags: ["shadcn", "origin"],
    render: () => (
      <Row>
        <Select>
          <SelectTrigger className="w-media-3xl">
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">选项 A</SelectItem>
            <SelectItem value="b">选项 B</SelectItem>
            <SelectItem value="c">选项 C</SelectItem>
          </SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="w-media-3xl">
            <SelectValue placeholder="禁用" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </Row>
    ),
  },

  /* ── 展示 ───────────────────────────────────────────────── */
  {
    name: "Badge",
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
            卡片自身用 shadow-flat，抬高由使用方按场景加 shadow-raised。
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
    group: "展示",
    tags: ["shadcn", "origin"],
    render: () => (
      <div className="flex w-full max-w-content-base-xl flex-col gap-md">
        <Separator />
        <div className="flex h-media-md items-center gap-md">
          <span className="text-body-sm">左</span>
          <Separator orientation="vertical" />
          <span className="text-body-sm">右</span>
        </div>
      </div>
    ),
  },
  {
    name: "Skeleton",
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
    group: "导航",
    tags: ["shadcn", "vxture"],
    deviation:
      "整套 API 自有：上游是 <a href> 组合件（URL 驱动），工作台全是受控回调",
    render: () => <PaginationDemo />,
  },

  /* ── 浮层 ───────────────────────────────────────────────── */
  {
    name: "Dialog",
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
    group: "浮层",
    tags: ["shadcn", "vxture"],
    deviation:
      "对应上游 Sheet（非其 vaul 版 Drawer）；受控便捷式 API 而非组合式——页眉页脚结构固定",
    render: () => <DrawerDemo />,
  },
  {
    name: "DropdownMenu",
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
    group: "反馈",
    tags: ["shadcn", "vxture"],
    deviation:
      "整套 API 自有：上游现行方案是 sonner，迁移要动产品侧 16 处 useToast，需单独立项",
    render: () => <ToastDemo />,
  },

  /* ── 图案（完全自建）─────────────────────────────────────── */
  {
    name: "ViewHeader",
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
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "SplitViewLayout 的左栏。条目是左对齐两行块，不复用 Button——后者是单行居中控件，套上去要一串 className 把布局全覆盖掉",
    render: () => <SectionNavDemo />,
  },
  {
    name: "FilterBar",
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
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "count 为 0 时返回 null——它只在有选中项时存在。删了 primaryActions：无选中时也显示的动作属于 FilterBar",
    render: () => <BulkActionBarDemo />,
  },
  {
    name: "DialogForm",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "页脚由 props 描述而非 markup 槽，danger 一个开关覆盖常规/危险两种提交。字段区仍是 children——表单字段是业务形状",
    render: () => <DialogFormDemo />,
  },
];

/* 需要局部状态的几件单独成组件——registry 本身保持成数据。 */

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
