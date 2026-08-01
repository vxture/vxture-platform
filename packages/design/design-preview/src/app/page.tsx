"use client";

/**
 * page.tsx - 设计系统预览面。
 * @package @vxture/design-preview
 *
 * 这页只做一件事：把 DS 的组件原样摆出来，**不加一行本地样式**。看到什么，DS
 * 就产出什么——产品那边贴的皮在这里一律不存在，所以这页难看就是 DS 难看。
 *
 * 三根模式轴（明暗 / 密度 / 字号）在顶部可切，切了整页跟随。它们不是 provider，
 * 是 html 上的类名，和产品运行时的机制完全一致。
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Icon,
  Input,
  Label,
  PageHeader,
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
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTheme,
  useToast,
  type StatusBadgeTone,
} from "@vxture/design-system";
import {
  DENSITIES,
  FONT_SIZES,
  PendingNote,
  Row,
  Section,
  useRootClass,
  type Density,
  type FontSize,
} from "@/preview/kit";

const NAV = [
  { id: "foundation", label: "基础" },
  { id: "button", label: "Button" },
  { id: "badge", label: "Badge / StatusBadge" },
  { id: "form", label: "表单控件" },
  { id: "card", label: "Card" },
  { id: "nav", label: "导航" },
  { id: "overlay", label: "浮层" },
  { id: "feedback", label: "反馈" },
  { id: "patterns", label: "图案" },
] as const;

const TONES: readonly StatusBadgeTone[] = [
  "neutral",
  "brand",
  "info",
  "success",
  "warning",
  "danger",
];

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

export default function PreviewPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [density, setDensity] = React.useState<Density>("default");
  const [fontSize, setFontSize] = React.useState<FontSize>("default");
  const [page, setPage] = React.useState(3);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  useRootClass("density-", density, DENSITIES);
  useRootClass("vx-font-", fontSize, FONT_SIZES);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen">
        {/* w-72 是裸值：T2 目前**没有侧栏宽度刻度**——container-* 是页面与正文宽度，
            拿来当侧栏会宽到半屏。这是预览面暴露出的第一个 token 缺口，记在
            workplans 的未决表（sidebar-* / topbar-* 的归属）。 */}
        <aside className="sticky top-none hidden h-screen w-72 shrink-0 flex-col gap-lg border-r border-border bg-surface-1 p-lg lg:flex">
          <div className="flex flex-col gap-2xs">
            <span className="text-label-lg text-foreground">
              Design Preview
            </span>
            <span className="text-body-xs text-muted-foreground">
              仅开发用，不发布不部署
            </span>
          </div>
          <nav className="flex flex-col gap-2xs">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="rounded-md px-sm py-xs text-body-sm text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-xl p-xl">
          <div className="sticky top-none z-sticky flex flex-wrap items-center gap-lg rounded-lg border border-border bg-card/95 p-md shadow-raised backdrop-blur">
            <Axis
              label="主题"
              value={theme}
              options={["light", "dark", "system"]}
              onChange={(v) => setTheme(v as typeof theme)}
            />
            <Separator orientation="vertical" className="h-control-md" />
            <Axis
              label="密度"
              value={density}
              options={DENSITIES}
              onChange={(v) => setDensity(v as Density)}
            />
            <Separator orientation="vertical" className="h-control-md" />
            <Axis
              label="字号"
              value={fontSize}
              options={FONT_SIZES}
              onChange={(v) => setFontSize(v as FontSize)}
            />
          </div>

          <Section
            id="foundation"
            title="基础"
            note="排版角色与语义色。字号三档改的是这里，密度三档改的是下面所有控件的高度与留白。"
          >
            <Row label="排版角色" stack>
              <p className="text-display-sm text-foreground">Display · 展示</p>
              <p className="text-heading-2 text-foreground">Heading 2 · 标题</p>
              <p className="text-body-md text-foreground">
                Body · 正文。中英混排时的行高与字距由 :lang(zh) 轴承担。
              </p>
              <p className="text-caption text-muted-foreground">
                Caption · 辅助说明
              </p>
              <p className="text-overline text-muted-foreground">OVERLINE</p>
            </Row>
            <Row label="语义色（填充 / 弱化 / 描边）">
              {(
                [
                  "primary",
                  "destructive",
                  "success",
                  "warning",
                  "info",
                  "ai",
                ] as const
              ).map((c) => (
                <div key={c} className="flex flex-col items-center gap-2xs">
                  <div className={`size-media-sm rounded-md bg-${c}`} />
                  <div className={`size-media-sm rounded-md bg-${c}-muted`} />
                  <span className="text-body-xs text-muted-foreground">
                    {c}
                  </span>
                </div>
              ))}
            </Row>
            <Row label="视觉高度">
              {(["flat", "raised", "sticky", "overlay", "dialog"] as const).map(
                (s) => (
                  <div
                    key={s}
                    className={`flex size-media-lg items-center justify-center rounded-md bg-card text-body-xs text-muted-foreground shadow-${s}`}
                  >
                    {s}
                  </div>
                ),
              )}
            </Row>
          </Section>

          <Section
            id="button"
            title="Button"
            note="variant × size 两轴正交。尺寸档跟随密度，不跟随字号——切密度看高度变化。"
          >
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
                <Button variant={v} size="icon" aria-label="图标按钮">
                  <Icon name="plus" size={16} />
                </Button>
              </Row>
            ))}
          </Section>

          <Section
            id="badge"
            title="Badge / StatusBadge"
            note="StatusBadge 的 tone 只表达语气，不表达业务状态——把「订阅逾期」映射成 warning 是产品的判断。"
          >
            <Row label="Badge">
              {(
                ["default", "secondary", "destructive", "outline"] as const
              ).map((v) => (
                <Badge key={v} variant={v}>
                  {v}
                </Badge>
              ))}
            </Row>
            <Row label="StatusBadge · 六种语气">
              {TONES.map((t) => (
                <StatusBadge key={t} tone={t}>
                  {t}
                </StatusBadge>
              ))}
            </Row>
            <Row label="带圆点（密集列表里不靠颜色也能分辨）">
              {TONES.map((t) => (
                <StatusBadge key={t} tone={t} dot>
                  {t}
                </StatusBadge>
              ))}
            </Row>
          </Section>

          <Section
            id="form"
            title="表单控件"
            note="焦点环、失效态与禁用态在所有控件上统一。"
          >
            <div className="flex w-full max-w-content-base-xl flex-col gap-md">
              <Field label="名称" htmlFor="f-name">
                <Input id="f-name" placeholder="请输入名称" />
              </Field>
              <Field
                label="失效态（aria-invalid 驱动，不额外开 prop）"
                htmlFor="f-bad"
              >
                <Input id="f-bad" aria-invalid defaultValue="不合法的取值" />
              </Field>
              <Field label="禁用" htmlFor="f-off">
                <Input id="f-off" disabled defaultValue="不可编辑" />
              </Field>
              <Field label="下拉选择" htmlFor="f-sel">
                <Select>
                  <SelectTrigger id="f-sel">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">选项 A</SelectItem>
                    <SelectItem value="b">选项 B</SelectItem>
                    <SelectItem value="c">选项 C</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="多行输入" htmlFor="f-desc">
                <Textarea id="f-desc" placeholder="随内容增高" />
              </Field>
              <Row label="选择类">
                <span className="flex items-center gap-xs">
                  <Checkbox id="f-cb" defaultChecked />
                  <Label htmlFor="f-cb">复选框</Label>
                </span>
                <span className="flex items-center gap-xs">
                  <Checkbox id="f-cb2" />
                  <Label htmlFor="f-cb2">未选中</Label>
                </span>
                <span className="flex items-center gap-xs">
                  <Switch id="f-sw" defaultChecked />
                  <Label htmlFor="f-sw">开关</Label>
                </span>
                <span className="flex items-center gap-xs">
                  <Switch id="f-sw2" />
                  <Label htmlFor="f-sw2">关闭</Label>
                </span>
              </Row>
            </div>
          </Section>

          <Section id="card" title="Card">
            <Row stack>
              <Card className="w-full max-w-content-base-xl">
                <CardHeader>
                  <CardTitle>模型接入</CardTitle>
                  <CardDescription>
                    Atlas 平台的模型供给与配额。
                  </CardDescription>
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
            </Row>
          </Section>

          <Section id="nav" title="导航">
            <Row label="Breadcrumb" stack>
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
            </Row>
            <Row label="Tabs" stack>
              <Tabs
                defaultValue="overview"
                className="w-full max-w-content-base-xl"
              >
                <TabsList>
                  <TabsTrigger value="overview">概览</TabsTrigger>
                  <TabsTrigger value="quota">配额</TabsTrigger>
                  <TabsTrigger value="audit">审计</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <p className="text-body-sm text-muted-foreground">
                    概览内容。
                  </p>
                </TabsContent>
                <TabsContent value="quota">
                  <p className="text-body-sm text-muted-foreground">
                    配额内容。
                  </p>
                </TabsContent>
                <TabsContent value="audit">
                  <p className="text-body-sm text-muted-foreground">
                    审计内容。
                  </p>
                </TabsContent>
              </Tabs>
            </Row>
            <Row label="Pagination" stack>
              <Pagination
                className="w-full max-w-content-base-xl"
                page={page}
                pageCount={9}
                total={168}
                pageSize={20}
                onPageChange={setPage}
              />
            </Row>
            <Row label="Avatar">
              <Avatar>
                <AvatarFallback>VX</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>运维</AvatarFallback>
              </Avatar>
            </Row>
          </Section>

          <Section
            id="overlay"
            title="浮层"
            note="叠放次序走 z-index 语义阶梯；Drawer 对应 shadcn 的 Sheet，由 Radix Dialog 提供焦点陷阱与滚动锁。"
          >
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

              <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                打开 Drawer
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">下拉菜单</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>操作</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>编辑</DropdownMenuItem>
                  <DropdownMenuItem>复制</DropdownMenuItem>
                  <DropdownMenuItem>删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Popover</Button>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-body-sm text-foreground">
                    浮层内容。定位与碰撞处理由 Radix 承担。
                  </p>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">悬停看提示</Button>
                </TooltipTrigger>
                <TooltipContent>提示文本</TooltipContent>
              </Tooltip>
            </Row>

            <Drawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              title="模型详情"
              description="右侧滑出，Esc 或点击遮罩关闭。"
              footer={
                <>
                  <Button
                    variant="outline"
                    onClick={() => setDrawerOpen(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={() => setDrawerOpen(false)}>保存</Button>
                </>
              }
            >
              <p className="text-body-sm text-muted-foreground">
                抽屉的页眉页脚结构是固定的，内容区由 children 承担。
              </p>
            </Drawer>
          </Section>

          <Section
            id="feedback"
            title="反馈"
            note="Toast 的 error 用 assertive 播报，其余 polite——不打断屏幕阅读器。"
          >
            <Row label="Toast">
              {(["success", "error", "warning", "info", "ai"] as const).map(
                (tone) => (
                  <Button
                    key={tone}
                    variant="outline"
                    onClick={() =>
                      toast({
                        tone,
                        title: `${tone} 通知`,
                        description: "这是一条示例通知。",
                      })
                    }
                  >
                    {tone}
                  </Button>
                ),
              )}
            </Row>
            <Row label="Skeleton" stack>
              <div className="flex w-full max-w-content-base-xl flex-col gap-md">
                <Skeleton lines={3} />
                <Skeleton variant="rect" height={80} />
                <Skeleton variant="circle" />
              </div>
            </Row>
          </Section>

          <Section
            id="patterns"
            title="图案"
            note="上游 shadcn 没有对应件、且已被产品各自重写过的组合件。收录门槛是实据不是设想。"
          >
            <Row label="PageHeader" stack>
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
            </Row>
            <Row label="EmptyState" stack>
              <EmptyState
                className="w-full"
                icon="inbox"
                title="还没有任何记录"
                description="创建第一条记录后，这里会显示它的状态与最近变更。"
                action={<Button>新建</Button>}
              />
            </Row>
            <PendingNote />
          </Section>
        </main>
      </div>
    </TooltipProvider>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2xs">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Axis({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-sm">
      <span className="text-label-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2xs">
        {options.map((o) => (
          <Button
            key={o}
            size="sm"
            variant={o === value ? "default" : "ghost"}
            onClick={() => onChange(o)}
          >
            {o}
          </Button>
        ))}
      </div>
    </div>
  );
}
