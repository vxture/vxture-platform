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
 * 整套是我们的（上游现行方案是 sonner，换过去要动产品侧 16 处）；PageHeader
 * 则上游根本没有，是从产品重复里提炼出来的图案。
 *
 * 这份清单同时是统计卡的数据源——数字不手写，从这里算。
 */

import * as React from "react";
import {
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
  EmptyState,
  PageHeader,
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
    name: "PageHeader",
    group: "图案",
    tags: ["vxture", "patterns"],
    deviation:
      "产品扫描出现频次第一（72 处文件）。删了 5 个 *ClassName 逃生口与 actions 别名——逃生口会把页头内部 DOM 变成公开契约",
    render: () => (
      <PageHeader
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
];

/* 需要局部状态的三件单独成组件——registry 本身保持成数据。 */

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
