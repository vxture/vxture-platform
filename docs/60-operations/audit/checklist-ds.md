# Design System 审计记录

日期：2026-05-09  
范围：`@vxture/design-system` 包自身规范性，以及 `portals/*`、`agent-studio/*`、`business/*`、`packages/*` 对 DS 的使用规范性。  
目标：记录当前已完成收敛后的遗留问题，作为后续分批治理清单。

## 当前基线

- `pnpm lint:design` 当前通过。
- `portals/website/src/components/ui` 已清理，业务组件迁移到语义目录。
- `website` / `console` / `admin` / `ruyin` / `agent-studio/varda` 均已通过 `@vxture/design-system/styles/globals.css` 引入 DS 全局样式。
- `lint:design` 已覆盖 `portals`、`packages`、`agent-studio`、`business`。
- `website` / `console` 不再维护应用层 `.vx-auth-*` / `.vx-captcha-*` 样式源。
- `console` / `admin` build 已恢复 lint/type 检查。
- `lint:design` 已新增 inline design style / native primitive / app `--vx-*` token definition / app hardcoded scale 检查，并通过 `scripts/guardrails/design-system-baseline.json` 锁住存量债务，禁止新增签名。
- 当前 `pnpm lint:design` 通过；`scripts/guardrails/design-system-baseline.json` 的 `allowed` 为空数组。应用层 `--vx-*` token 定义、业务源码原生基础控件、原生表格、设计型 inline style、应用 CSS 硬编码尺度均进入零 baseline 新增拦截模式。
- `agent-studio/varda` 根布局已接入统一字体、ThemeProvider、FullscreenProvider；核心聊天组件已移除 inline design style 和原生基础控件。
- 源码扫描未发现业务源码直接导入 `@vxture/design-system/src/**`。
- 源码扫描未发现业务源码直接导入 `@phosphor-icons/react`、`lucide-react`、`react-icons`、`@radix-ui/*`；`lint:design` 已用 `ds/no-direct-ui-engine-imports` 禁止新增。
- DS `platform.css` 已拆分为稳定聚合入口和 `platform-*` 分层模块，后续可按 L2/L3/L4 边界逐模块收敛。
- DS `console.css` 已拆分为稳定 Console portal style pack 入口和 `console-*` 模块。
- admin `admin-shell.css` 已拆分为稳定聚合入口和 shell 模块；入口仅保留 `@import`。
- admin `admin-assistant.css`、`admin-permissions.css` 已拆分为稳定聚合入口和 domain 模块；`admin-assistant-messages.css`、`admin-assistant-composer.css`、`admin-assistant-conversation.css` 已继续拆成 assistant 二级域模块；入口仅保留 `@import`。
- admin `admin-assistant-conversation-suggestions.css` 已按 layout/buttons/dark 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-assistant-messages-bubbles.css` 已按 base/tones/copy 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-assistant-panel.css` 已按 floating/mode 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-assistant-panel-floating.css` 已按 surface/responsive/hidden 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-permissions-core.css` 已按 structure/domain/cards/types 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-permissions-core-cards.css` 已按 grid/surface/header/copy/metadata 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-permissions-tree.css` 已按 shell/workspace 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-shell-core.css`、`admin-shell-nav.css`、`admin-permissions-tree-node.css` 已拆分为稳定二级聚合入口和 shell/permissions 子模块；入口仅保留 `@import`。
- admin `admin-shell-core-actions.css` 已按 layout/search/group 拆分；`admin-permissions-tree-node-title.css` 已按 shell/row/copy/tags 拆分；入口仅保留 `@import`。
- admin `admin-shell-nav-items.css` 已按 sections/links/visibility/state 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-shell-nav-collapsed.css` 已按 sidebar/nav 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-shell-sidebar.css`、`admin-workspace-switcher.css` 已拆分为稳定二级聚合入口和 shell/workspace 子模块；入口仅保留 `@import`。
- admin `admin-workspace-switcher-items.css` 已按 base/platform/hover 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-service-health.css`、`admin-operations.css` 已拆分为稳定聚合入口和 domain 模块；入口仅保留 `@import`。
- admin `admin-service-health-core.css` 已按 page/status 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-service-health-summary-toolbar-controls.css` 已按 search/filters/buttons 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-operations-tickets.css` 已按 types/rows/alignment/sticky/selection 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-operations-skills.css` 已按 list/rows/cards/responsive 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-operations-controls.css` 已按 filter/view-toggle/actions 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-operations-dialog.css` 已按 surface/header/body/footer 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-directory.css`、`admin-platform-autonomy.css` 已拆分为稳定聚合入口和 domain 模块；入口仅保留 `@import`。
- admin `admin-platform-autonomy-domains.css` 已按 layout/card/links 拆分；`admin-platform-autonomy-panels.css` 已按 shell/header/resource-table/resource-rows 拆分；入口仅保留 `@import`。
- admin `admin-directory-list.css` 已按 shell/row/identity 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-directory-cards.css` 已按 shell/header/metrics/footer 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-products.css`、`admin-governance.css` 已拆分为稳定聚合入口和 domain 模块；入口仅保留 `@import`。
- admin `admin-products-summary-toolbar.css` 已按 summary/search/buttons 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-governance-list.css` 已按 shell/state/sticky/row-content 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-auth-captcha.css`、`admin-roles.css` 已拆分为稳定聚合入口和 domain 模块；入口仅保留 `@import`。
- admin `admin-auth-captcha-puzzle.css` 已按 target/piece/handle 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-roles-auth-dialog.css` 已按 shell/tree/node/footer 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-roles-permission-dialog.css` 已按 surface/header/list 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-management.css` 已拆分为稳定聚合入口和 domain 模块；入口仅保留 `@import`。
- admin `admin-management-commerce.css`、`admin-management-directory.css`、`admin-tenant-detail.css` 已拆分为稳定聚合入口和 domain 模块；入口仅保留 `@import`。
- admin `admin-management-directory-commerce.css`、`admin-management-commerce-transactions.css` 已拆分为稳定二级聚合入口和 L4 子域模块；入口仅保留 `@import`。
- admin `admin-management-directory-commerce-grids.css` 已按 orders-billing/invoices-payments/usage-promotions/redemptions 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-directory-commerce-transactions-sticky.css` 已按 start/end sticky columns 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-commerce-commercial.css` 已按 layout/status/pills 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-management-commerce-overview-risks.css` 已按 lists/items/tones/copy 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-commerce-subscriptions.css`、`admin-management-products-capability.css` 已拆分为稳定二级聚合入口和 L4 子域模块；入口仅保留 `@import`。
- admin `admin-management-commerce-subscriptions-list.css` 已按 search/rows/status/cards 拆分；`admin-management-commerce-transactions-billing.css` 已按 rows/exceptions/status/cards 拆分；`admin-management-commerce-transactions-payments.css` 已按 rows/status/cards 拆分；入口仅保留 `@import`。
- admin `admin-management-commerce-transactions-invoices.css` 已按 rows/status/cards 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-commerce-transactions-orders.css` 已按 rows/status/cards 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-products-capability-lists.css` 已按 rows/notes/interactive 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-products-capability-detail.css` 已按 layout/description/related 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-products-capability-summary.css` 已按 shell/identity/metrics 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-tenant-detail-shell.css`、`admin-tenant-detail-members.css` 已拆分为稳定二级聚合入口和 L4 子域模块；入口仅保留 `@import`。
- admin `admin-tenant-detail-shell-header.css` 已按 layout/title/metrics 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-tenant-detail-config.css`、`admin-management-pills-products.css`、`admin-management-pills-commerce.css` 已拆分为稳定二级聚合入口和 L4 子域模块；入口仅保留 `@import`。
- admin `admin-tenant-detail-config-review.css` 已按 actions/fields/readonly/admin-rows 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-overview-core.css`、`admin-overview-service.css` 已拆分为稳定二级聚合入口和 overview 子域模块；入口仅保留 `@import`。
- admin `admin-overview-core-header.css`、`admin-overview-service-data.css`、`admin-overview-models-rows.css` 已拆分为稳定三级聚合入口和 overview 子域模块；入口仅保留 `@import`。
- admin `admin-overview-models.css`、`admin-management-models-rows.css` 已拆分为稳定二级聚合入口和模型子域模块；入口仅保留 `@import`。
- admin `admin-overview-models-metrics.css` 已按 shell/values/tags 拆分；`admin-overview-metrics-pulse.css` 已按 layout/values/tags 拆分；入口仅保留 `@import`。
- admin `admin-management-models-platform.css` 已按 layout/sticky/rows 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-overview-metrics.css`、`admin-overview-products.css`、`admin-service-health-summary.css`、`admin-service-health-catalog.css` 已拆分为稳定二级聚合入口和概览/服务健康子域模块；入口仅保留 `@import`。
- admin `admin-overview-products-rows.css` 已按 layout/medals/copy/value 拆分为三级聚合入口；`admin-service-health-catalog-list.css` 已按 table/service/empty 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-service-health-catalog-cards.css` 已按 shell/header/status/meta 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-service-health-summary-toolbar.css` 已按 layout/controls 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-models-strategy.css`、`admin-management-models-shared.css`、`admin-management-products-service-plans.css` 已拆分为稳定二级聚合入口和模型/服务方案子域模块；入口仅保留 `@import`。
- admin `admin-management-models-strategy-lists.css`、`admin-management-directory-roles.css` 已拆分为稳定三级聚合入口和模型策略/角色目录子域模块；入口仅保留 `@import`。
- admin `admin-management-directory-roles-layout.css` 已按 grid/identity/cells 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-core.css`、`admin-overview-business.css`、`admin-management-commerce-overview.css` 已拆分为稳定二级聚合入口和管理/概览子域模块；入口仅保留 `@import`。
- admin `admin-management-core-toolbar.css` 已按 shell/controls/filters 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-tenant-workspace.css`、`admin-management-directory-products.css` 已拆分为稳定二级聚合入口和租户工作台/产品目录子域模块；入口仅保留 `@import`。
- admin `admin-management-tenant-workspace-cards.css` 已按 shell/tones/body/meta 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-commerce-subscriptions-dialog.css`、`admin-management-directory-commerce-growth.css` 已拆分为稳定三级聚合入口和订阅弹窗/增长目录子域模块；入口仅保留 `@import`。
- admin `admin-management-directory-platform-users.css`、`admin-tenant-detail-activity.css` 已拆分为稳定二级聚合入口和平台用户/租户活动子域模块；入口仅保留 `@import`。
- admin `admin-tenant-detail-members-list.css` 已按 shell/row/identity 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-directory-commerce-transactions.css`、`admin-management-pills-responsive.css` 已拆分为稳定二级聚合入口和交易目录/响应式子域模块；入口仅保留 `@import`。
- admin `admin-management-models.css`、`admin-management-pills.css`、`admin-management-products.css` 已拆分为稳定聚合入口和 domain 模块；入口仅保留 `@import`。
- admin `admin-management-models-rows-actions.css` 已按 base/batch/danger/layout 拆分；`admin-management-models-rows-shared.css` 已按 copy/controls 拆分；`admin-management-pills-responsive-tenant.css` 已按 grids/toolbar/detail/config 拆分；入口仅保留 `@import`。
- admin `admin-management-pills-base.css` 已按 status/account/workflow/verification 拆分为二级聚合入口；入口仅保留 `@import`。
- admin `admin-directory-actions.css` 已按 shell/trigger/menu/buttons 拆分；`admin-governance-cards.css` 已按 shell/header/copy/footer 拆分；`admin-governance-list-row-content.css` 已按 identity/copy/alignment/fallback 拆分；`admin-platform-autonomy-metrics.css` 已按 layout/cards/tones/icon/copy 拆分；入口仅保留 `@import`。
- admin `admin-management-core-summary.css` 已按 layout/cards/copy/tones 拆分；`admin-management-directory-accounts.css`、`admin-management-directory-commerce-subscriptions.css` 已按 grids/sticky/selection 拆分；`admin-management-directory-products-plans.css` 已按 layout/alignment/sticky/selection 拆分；`admin-management-products-capability-lists-rows.css` 已按 shell/cells/copy/tones 拆分；入口仅保留 `@import`。
- admin `admin-overview-products-metrics.css` 已按 layout/icon/copy/values 拆分为三级聚合入口；入口仅保留 `@import`。
- admin `admin-management-directory-verifications.css`、`admin-management-directory-products-solutions.css` 已按 layout/alignment/sticky/selection 拆分；`admin-management-commerce-subscriptions-dialog-fields.css` 已按 shell/controls/select/state 拆分；入口仅保留 `@import`。
- admin `admin-auth-captcha-modal.css` 已按 shell/backdrop/panel/header/close 拆分；`admin-auth-captcha-surface.css` 已按 hint/image/slider/progress 拆分；`admin-assistant-composer-actions.css` 已按 layout/buttons/send/states 拆分；`admin-assistant-messages-bubbles-tones.css` 已按 user/assistant/states/dark 拆分；入口仅保留 `@import`。
- admin `admin-overview-business-cards.css` 已按 layout/shell/icon/copy/values 拆分；`admin-overview-core-header-heading.css` 已按 layout/icon/copy/page 拆分；`admin-overview-responsive.css` 已按 grids/business/service/heading 拆分；入口仅保留 `@import`。
- admin `admin-management-products-service-plans-groups.css` 已按 shell/header/identity/meta 拆分；`admin-directory-layout.css` 已按 shell/header/pagination/page-size 拆分；`admin-shell-core-actions-search.css` 已按 shell/input/states/dark 拆分；入口仅保留 `@import`。
- admin `admin-management-commerce-subscriptions-detail.css` 已按 links/timeline/copy/tones 拆分；`admin-products-pricing.css` 已按 price/features/footer/weight 拆分；`admin-management-directory-commerce-growth-sticky.css` 已按 start/end 拆分；入口仅保留 `@import`。
- admin `admin-assistant-panel-floating-surface.css` 已按 layout/chrome/dark 拆分；`admin-management-directory-platform-users-rows.css` 已按 selection/copy/role/directory 拆分；`admin-permissions-tree-node-detail.css` 已按 row/copy/summary/code 拆分；`admin-shell-sidebar-top.css` 已按 layout/title/rail/toggle 拆分；`admin-base.css`、`admin-directory-status.css` 已继续拆分为 base/status 子模块；入口仅保留 `@import`。
- admin `admin-overview-products-rankings.css` 已按 layout/card/header/copy 拆分；`admin-overview-business-panel.css` 已按 shell/header/actions 拆分；`admin-overview-service-metrics.css` 已按 layout/card/copy/rating 拆分；`admin-overview-metrics-band-body.css` 已按 layout/primary/copy/support 拆分；入口仅保留 `@import`。
- admin `admin-management-directory-commerce-transactions-headers.css` 已按 order/billing/invoice/payment/default 拆分；`admin-management-directory-operations.css` 已按 layout/sticky/selection 拆分；`admin-tenant-detail-members-cards.css` 已按 layout/shell/header/copy/metrics 拆分；入口仅保留 `@import`。
- admin `admin-management-directory-commerce-growth-alignment.css` 已按 primary/default/rows 拆分；`admin-permissions-tree-node-status.css` 已按 alignment/actions/role/layers 拆分；`admin-service-health-summary-cards.css` 已按 layout/item/copy/value 拆分；`admin-operations-audit.css` 已按 layout/copy/result/meta 拆分；`admin-management-pills-base-workflow.css` 已按 risk/permission/ticket 拆分；入口仅保留 `@import`。
- admin `admin-overview.css` 已拆分为稳定聚合入口和 overview domain 模块；入口仅保留 `@import`。
- website `globals.css` 已拆分为稳定聚合入口和 `website-*` 模块。
- Varda `globals.css` 已拆分为稳定聚合入口和 `varda-*` 模块。
- Ruyin `globals.css` 已拆分为稳定聚合入口和 `ruyin-*` 模块。
- `lint:design` 已用 `ds/no-style-entry-rules` 约束 DS style pack、admin shell、admin assistant、admin permissions、admin service health、admin operations、admin management 系列、admin overview、tenant detail 和应用 `globals.css` 大入口保持 import-only。

## 审计命令

```bash
pnpm lint:design
rg -n "@vxture/design-system" portals agent-studio business packages --glob "!packages/design/design-system/**"
rg -n "@vxture/design-system/" portals business agent-studio packages --glob "*.ts" --glob "*.tsx" --glob "*.css"
rg -n "#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(" portals packages agent-studio business --glob "!packages/design/design-system/**" --glob "!**/public/**"
rg -n "style=\{\{|<button|<input|<select|<textarea" portals/website/src portals/console/src portals/admin/src agent-studio/varda/src
rg -n -- "--vx-[\w-]+\s*:" portals business agent-studio --glob "*.css"
rg -n "@phosphor-icons/react|lucide-react|react-icons|@radix-ui/" portals business agent-studio --glob "*.ts" --glob "*.tsx"
rg -n "@phosphor-icons/react|lucide-react|react-icons|@radix-ui/" portals business agent-studio --glob "package.json"
```

## DS/CSS 分层分级治理模型（2026-05-14）

### 治理目标

- DS 负责规则、基准、通用能力和可复用模式；应用端负责业务语义组装，不把所有页面细节下沉到 DS。
- “组装不是定义”：应用可以用业务 class 编排 DS 组件和语义类，但不得重新定义 DS primitive、底层 UI 引擎、`--vx-*` token 或基础视觉尺度。
- CSS 收敛以边界清晰为第一优先级，其次才是减少行数；行数下降必须来自分层和复用，不来自隐藏重复实现。

### 分层职责

1. L0 Foundation：归属 DS。包含 `tokens.css`、`typography.css`、`tailwind.css`、theme/density/font 基线。只定义平台级 token、字体、密度、主题变量。应用只能消费，不得定义 `--vx-*`。
2. L1 Primitive：归属 DS。包含 Button、Input、Select、Checkbox、Card、Badge、Icon、Dialog、基础表单控件等 React primitive 与 `.vx-*` 基础语义类。应用不得手写原生基础控件替代，也不得直接依赖图标库、Radix 等底层 UI 引擎。
3. L2 Platform Pattern：归属 DS。包含跨两个及以上应用复用的结构模式，例如 DataTable、FilterBar、ActionMenu、Pagination、DialogForm、StatusBadge、MetricCard、通用 page header/table toolbar/shell chrome 模式。命名必须保持平台语义，不能携带具体业务实体。
4. L3 Portal Experience：归属 portal。包含 admin/console/website/ruyin/agent-studio 的导航、工作区切换、门户 chrome、响应式布局和产品气质。可以组装 DS L1/L2，但不能新增基础 token、基础控件或通用 pattern 的第二实现。
5. L4 Domain Assembly：归属业务模块。包含租户、账单、权限、模型平台、运营治理等实体页面的业务语义布局、状态组合和局部信息密度。业务 class 只能表达语义编排，不能承载通用控件能力。
6. L5 Runtime Dynamic：归属调用现场。仅允许动态坐标、进度、CSS 变量赋值、背景图 URL、动画延迟等运行时值。设计型颜色、字号、间距、圆角、阴影不得以内联样式出现。

### 下沉判定

- 进入 DS：同一结构被两个及以上 portal/domain 复用；或它承载可访问性、主题、密度、焦点、键盘交互、图标规范等平台规则；或它是基础控件/表格/菜单/弹窗/分页/筛选器。
- 保留在 Portal：只体现某个应用的 chrome、信息架构、导航密度、工作区体验、品牌入口或首屏布局，且不应成为其他应用默认规范。
- 保留在 Domain：只与具体实体、权限、状态机、业务指标和数据组织有关；可使用 DS primitive/pattern，但不定义新的基础样式。
- 保留为 Runtime：值必须来自运行时数据或布局计算；如能提前写成 CSS token/class，就不应以内联方式存在。

### 命名与引用边界

- CSS custom property `--vx-*` 只由 DS 定义；应用 CSS 可以消费，但不得声明。
- DS 公共调用只允许 `@vxture/design-system`、`/tokens`、`/types`、`/server` 和 package exports 明确暴露的 `styles/*`；其他深层路径默认禁止。
- 应用 class 可以带门户/业务前缀表达组装语义，例如 `admin-*`、`console-*` 或历史 `vx-admin-*`，但这些 class 不构成 DS 公共契约。
- DS 中的 `platform.css` 只承载 L2 平台模式；若选择器出现强业务实体、单 portal 专属语义或页面级布局，应回退到 L3/L4。

### 全局验收规则

- `pnpm lint:design` 必须通过，且 `scripts/guardrails/design-system-baseline.json` 的 `allowed` 保持为空。
- 新增应用 CSS 不得定义 `--vx-*`，不得新增硬编码颜色、字号、间距、圆角、阴影等设计尺度。
- 新增业务源码不得直接写原生基础控件或原生表格；DS 不足时先补 DS，再迁移应用调用。
- 新增应用依赖不得声明 `@phosphor-icons/react`、`lucide-react`、`react-icons`、`@radix-ui/*` 等底层 UI 引擎。
- 每批次必须至少执行 `pnpm lint:design`、受影响 package 的 `lint` / `type-check` / `build`，并记录未执行项原因。

## 六批次执行计划（2026-05-14）

1. P0：固化分层模型与验收口径。范围：本审计清单、DS-USE 状态修正、六批次任务定义。验收：`git diff --check`、`pnpm lint:design` 通过；提交独立 commit。
2. P1：拆分 DS `platform.css`。状态：已完成机械拆分；`platform.css` 保持稳定聚合入口，具体规则分布到 core/account/notifications/tenant-settings/layout/models/access/shell/content 模块。后续继续逐模块判断 L2 留 DS、L3/L4 回 portal/domain。验收：DS lint/build、`pnpm lint:design`、admin build、console build 通过。
3. P1：重整 Console 样式边界。状态：已完成机械拆分；`console.css` 保持稳定公开入口，具体规则分布到 base/shell-layout/tenant-switcher/assistant/shell-chrome/responsive 模块。后续继续逐模块判定哪些是 Console L3 portal 体验，哪些可升级为 DS L2 平台模式。验收：DS lint/build、`pnpm lint:design`、console build 通过。
4. P1：继续收敛 Admin 管理域。状态：已完成机械拆分；`admin-shell.css` 已拆成 core/sidebar/nav/responsive/content/locale/compact 模块；`admin-shell-core.css` 已按 layout/brand/actions/user 拆分；`admin-shell-nav.css` 已按 scroll/items/footer/collapsed 拆分；`admin-shell-nav-items.css` 已按 sections/links/visibility/state 拆分；`admin-shell-sidebar.css` 已按 layout/top/tags/assistant 拆分；`admin-workspace-switcher.css` 已按 layout/items/content/dark 拆分；`admin-assistant.css` 已拆成 panel/conversation/messages/composer/responsive 模块；`admin-assistant-messages.css` 已按 bubbles/actions/thinking 拆分；`admin-assistant-composer.css` 已按 box/actions/input 拆分；`admin-assistant-conversation.css` 已按 bar/empty/suggestions 拆分；`admin-assistant-panel.css` 已按 floating/mode 拆分；`admin-permissions.css` 已拆成 core/tree/tree-node/dialog 模块；`admin-permissions-core.css` 已按 structure/domain/cards/types 拆分；`admin-permissions-tree.css` 已按 shell/workspace 拆分；`admin-permissions-tree-node.css` 已按 title/detail/status/structure 拆分；`admin-service-health.css` 已拆成 core/summary/catalog/responsive 模块；`admin-service-health-summary.css` 已按 cards/toolbar 拆分；`admin-service-health-summary-toolbar.css` 已按 layout/controls 拆分；`admin-service-health-catalog.css` 已按 cards/checks/list 拆分；`admin-operations.css` 已拆成 controls/audit/announcements/skills/dialog/tickets 模块；`admin-operations-dialog.css` 已按 surface/header/body/footer 拆分；`admin-operations-tickets.css` 已按 types/rows/alignment/sticky/selection 拆分；`admin-directory.css` 已拆成 layout/list/status/cards/actions/pagination 模块；`admin-directory-list.css` 已按 shell/row/identity 拆分；`admin-platform-autonomy.css` 已拆成 metrics/domains/panels/risks/responsive 模块；`admin-products.css` 已拆成 summary-toolbar/plans/releases/pricing/responsive 模块；`admin-governance.css` 已拆成 list/status/cards/responsive 模块；`admin-governance-list.css` 已按 shell/state/sticky/row-content 拆分；`admin-auth-captcha.css` 已拆成 modal/surface/puzzle/states 模块；`admin-roles.css` 已拆成 cards/permission-dialog/auth-dialog 模块；`admin-roles-permission-dialog.css` 已按 surface/header/list 拆分；`admin-management.css` 保持稳定聚合入口，具体规则分布到 core/directory/models/commerce/products/tenant-workspace 模块；`admin-management-core.css` 已按 page/summary/toolbar/view 拆分；`admin-management-tenant-workspace.css` 已按 nav/form/layout/cards 拆分；`admin-overview.css` 已拆成 core/metrics/business/products/models/service/responsive 模块；`admin-overview-core.css` 已按 cards/header/section/period/tones 拆分；`admin-overview-core-header.css` 已按 base/heading/actions 拆分；`admin-overview-business.css` 已按 layout/panel/cards/minor 拆分；`admin-overview-service.css` 已按 blocks/metrics/data/tips 拆分；`admin-overview-service-data.css` 已按 metrics/rankings/rating 拆分；`admin-overview-models.css` 已按 metrics/categories/rows 拆分；`admin-overview-models-rows.css` 已按 layout/medals/copy 拆分；`admin-overview-metrics.css` 已按 pulse/bands/band-body 拆分；`admin-overview-products.css` 已按 metrics/rankings/rows 拆分；`admin-management-commerce.css`、`admin-management-directory.css`、`admin-tenant-detail.css` 已按交易、目录、租户详情域拆分；`admin-management-commerce-overview.css` 已按 layout/risks/plans/links/footer 拆分；`admin-management-commerce-commercial.css` 已按 layout/status/pills 拆分；`admin-management-directory-commerce.css` 已按订阅、网格、解决方案、交易和增长域拆分；`admin-management-directory-commerce-growth.css` 已按 alignment/sticky/selection 拆分；`admin-management-directory-commerce-transactions.css` 已按 headers/rows/sticky/selection 拆分；`admin-management-directory-platform-users.css` 已按 layout/sticky/rows 拆分；`admin-management-directory-roles.css` 已按 layout/sticky/state 拆分；`admin-management-directory-products.css` 已按 solutions/plans 拆分；`admin-management-commerce-transactions.css` 已按 dialogs/orders/billing/invoices/payments 拆分；`admin-management-commerce-subscriptions.css` 已按 list/detail/actions/dialog 拆分；`admin-management-commerce-subscriptions-dialog.css` 已按 surface/header/fields/footer 拆分；`admin-management-products-capability.css` 已按 shared/summary/detail/lists 拆分；`admin-management-products-capability-summary.css` 已按 shell/identity/metrics 拆分；`admin-management-products-service-plans.css` 已按 controls/groups/rows/cards/detail 拆分；`admin-tenant-detail-shell.css` 已按 summary/header/collapsed/actions/metrics 拆分；`admin-tenant-detail-shell-header.css` 已按 layout/title/metrics 拆分；`admin-tenant-detail-activity.css` 已按 subscriptions/usage/risk/audit 拆分；`admin-tenant-detail-members.css` 已按 table/toolbar/list/cards 拆分；`admin-tenant-detail-members-list.css` 已按 shell/row/identity 拆分；`admin-tenant-detail-config.css` 已按 blocks/fields/review/kv/notes 拆分；`admin-management-models-rows.css` 已按 platform/name/role-directory/actions/pills/shared 拆分；`admin-management-models-platform.css` 已按 layout/sticky/rows 拆分；`admin-management-models-strategy.css` 已按 lists/rows/pills/cards/overrides 拆分；`admin-management-models-strategy-lists.css` 已按 layout/alignment/sticky 拆分；`admin-management-models-shared.css` 已按 tenant-product/commerce-primary/commerce-billing/payment-commercial/row-cells 拆分；`admin-management-pills-base.css` 已按 status/account/workflow/verification 拆分；`admin-management-pills-products.css` 已按 roles/product-types/plans/solutions/service-plans 拆分；`admin-management-pills-commerce.css` 已按 subscriptions/orders/billing/invoices/payments 拆分；`admin-management-pills-responsive.css` 已按 fallbacks/wide/tenant/products 拆分；`admin-management-models.css`、`admin-management-pills.css`、`admin-management-products.css` 已按模型、状态标识、产品服务域拆分。验收：admin build、`pnpm lint:design` 通过；大入口保持 import-only。
   本轮增量：`admin-assistant-messages-bubbles.css`、`admin-service-health-core.css`、`admin-management-commerce-subscriptions-list.css`、`admin-management-commerce-transactions-billing.css`、`admin-management-commerce-transactions-payments.css`、`admin-management-products-capability-lists.css`、`admin-overview-models-metrics.css`、`admin-overview-metrics-pulse.css` 已继续拆分为更细 L4 子域模块；入口仅保留 `@import`。
   第二轮增量：`admin-operations-skills.css`、`admin-platform-autonomy-domains.css`、`admin-platform-autonomy-panels.css`、`admin-auth-captcha-puzzle.css`、`admin-shell-core-actions.css`、`admin-management-directory-commerce-grids.css`、`admin-service-health-summary-toolbar-controls.css`、`admin-assistant-panel-floating.css`、`admin-management-commerce-transactions-invoices.css`、`admin-permissions-tree-node-title.css`、`admin-management-tenant-workspace-cards.css` 已继续拆分为更细 L4/L3 子模块；入口仅保留 `@import`。
   第三轮增量：`admin-permissions-core-cards.css`、`admin-roles-auth-dialog.css`、`admin-management-commerce-transactions-orders.css`、`admin-overview-products-rows.css`、`admin-management-products-capability-detail.css`、`admin-directory-cards.css`、`admin-tenant-detail-config-review.css`、`admin-service-health-catalog-list.css`、`admin-products-summary-toolbar.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第四轮增量：`admin-management-pills-responsive-tenant.css`、`admin-management-models-rows-actions.css`、`admin-management-models-rows-shared.css`、`admin-workspace-switcher-items.css`、`admin-management-directory-commerce-transactions-sticky.css`、`admin-shell-nav-collapsed.css`、`admin-management-core-toolbar.css`、`admin-service-health-catalog-cards.css`、`admin-management-commerce-overview-risks.css`、`admin-operations-controls.css`、`admin-management-directory-roles-layout.css`、`admin-assistant-conversation-suggestions.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第五轮增量：`admin-directory-actions.css`、`admin-governance-cards.css`、`admin-governance-list-row-content.css`、`admin-platform-autonomy-metrics.css`、`admin-overview-products-metrics.css`、`admin-management-core-summary.css`、`admin-management-directory-accounts.css`、`admin-management-directory-commerce-subscriptions.css`、`admin-management-directory-products-plans.css`、`admin-management-products-capability-lists-rows.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第六轮增量：`admin-management-directory-verifications.css`、`admin-assistant-messages-bubbles-tones.css`、`admin-management-commerce-subscriptions-dialog-fields.css`、`admin-management-directory-products-solutions.css`、`admin-overview-business-cards.css`、`admin-auth-captcha-modal.css`、`admin-overview-core-header-heading.css`、`admin-assistant-composer-actions.css`、`admin-overview-responsive.css`、`admin-auth-captcha-surface.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第七轮增量：`admin-management-products-service-plans-groups.css`、`admin-directory-layout.css`、`admin-shell-core-actions-search.css`、`admin-management-commerce-subscriptions-detail.css`、`admin-products-pricing.css`、`admin-management-directory-commerce-growth-sticky.css`、`admin-assistant-panel-floating-surface.css`、`admin-management-directory-platform-users-rows.css`、`admin-permissions-tree-node-detail.css`、`admin-shell-sidebar-top.css`、`admin-base.css`、`admin-directory-status.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第八轮增量：`admin-overview-products-rankings.css`、`admin-overview-business-panel.css`、`admin-management-directory-commerce-transactions-headers.css`、`admin-management-directory-operations.css`、`admin-tenant-detail-members-cards.css`、`admin-management-directory-commerce-growth-alignment.css`、`admin-permissions-tree-node-status.css`、`admin-overview-service-metrics.css`、`admin-overview-metrics-band-body.css`、`admin-service-health-summary-cards.css`、`admin-operations-audit.css`、`admin-management-pills-base-workflow.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第九轮增量：`admin-operations-tickets-rows.css`、`admin-overview-metrics-bands.css`、`admin-tenant-detail-config-fields.css`、`admin-tenant-detail-members-table.css`、`admin-management-directory-commerce-solutions.css`、`admin-management-commerce-transactions-payments-status.css`、`admin-assistant-composer-box.css`、`admin-management-pills-commerce-billing.css`、`admin-products-releases.css`、`admin-operations-announcements.css`、`admin-shell-core-brand.css`、`admin-overview-models-categories.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十轮增量：`admin-service-health-catalog-checks.css`、`admin-management-commerce-transactions-dialogs.css`、`admin-overview-core-cards.css`、`admin-management-pills-products-product-types.css`、`admin-management-products-service-plans-detail.css`、`admin-shell-nav-items-links.css`、`admin-permissions-tree-shell.css`、`admin-tenant-detail-shell-actions.css`、`admin-service-health-core-status.css`、`admin-management-models-strategy-lists-sticky.css`、`admin-overview-service-blocks.css`、`admin-tenant-detail-shell-header-title.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十一轮增量：`admin-shell-nav-items-sections.css`、`admin-products-plans.css`、`admin-roles-permission-dialog-header.css`、`admin-management-products-capability-shared.css`、`admin-management-commerce-subscriptions-list-status.css`、`admin-management-models-platform-rows.css`、`admin-operations-tickets-sticky.css`、`admin-assistant-conversation-bar.css`、`admin-roles-permission-dialog-list.css`、`admin-shell-responsive.css`、`admin-management-pills-products-roles.css`、`admin-overview-service-data-metrics.css`、`admin-management-commerce-transactions-billing-status.css`、`admin-permissions-tree-workspace.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十二轮增量：`admin-assistant-panel-mode.css`、`admin-assistant-conversation-suggestions-buttons.css`、`admin-shell-sidebar-assistant.css`、`admin-management-products-capability-detail-related.css`、`admin-management-pills-products-plans.css`、`admin-shell-core-layout.css`、`admin-management-models-rows-pills.css`、`admin-directory-list-row.css`、`admin-management-commerce-commercial-status.css`、`admin-tenant-detail-shell-metrics.css`、`admin-shell-core-user.css`、`admin-roles-auth-dialog-node.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十三轮增量：`admin-management-commerce-receipts.css`、`admin-tenant-detail-tabs.css`、`admin-directory-list-shell.css`、`admin-management-models-strategy-rows.css`、`admin-overview-models-rows-copy.css`、`admin-management-commerce-transactions-orders-status.css`、`admin-overview-core-period.css`、`admin-management-models-strategy-lists-alignment.css`、`admin-management-commerce-commercial-layout.css`、`admin-workspace-switcher-items-base.css`、`admin-platform-autonomy-domains-links.css`、`admin-operations-skills-cards.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十四轮增量：`admin-platform-autonomy-domains-card.css`、`admin-shell-locale.css`、`admin-service-health-core-page.css`、`admin-overview-models-metrics-values.css`、`admin-tenant-detail-members-list-row.css`、`admin-operations-dialog-body.css`、`admin-management-commerce-subscriptions-dialog-header.css`、`admin-management-pills-base-status.css`、`admin-management-core-toolbar-controls.css`、`admin-overview-service-tips.css`、`admin-management-commerce-transactions-invoices-status.css`、`admin-management-models-shared-tenant-product.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十五轮增量：`admin-management-products-capability-summary-identity.css`、`admin-tenant-detail-members-list-shell.css`、`admin-management-pills-products-solutions.css`、`admin-shell-nav-collapsed-nav.css`、`admin-management-products-capability-lists-rows-shell.css`、`admin-management-commerce-transactions-billing-rows.css`、`admin-governance-list-sticky.css`、`admin-management-pills-products-service-plans.css`、`admin-tenant-detail-activity-usage.css`、`admin-tenant-detail-members-list-identity.css`、`admin-tenant-detail-activity-subscriptions.css`、`admin-service-health-summary-toolbar-controls-filters.css`、`admin-management-directory-commerce-transactions-sticky-start.css`、`admin-overview-service-data-rankings.css`、`admin-service-health-responsive.css`、`admin-management-directory-roles-layout-identity.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十六轮增量：`admin-platform-autonomy-risks.css`、`admin-management-commerce-transactions-payments-rows.css`、`admin-service-health-catalog-list-table.css`、`admin-management-models-shared-row-cells.css`、`admin-assistant-messages-thinking.css`、`admin-auth-captcha-states.css`、`admin-management-directory-commerce-transactions-sticky-end.css`、`admin-shell-sidebar-layout.css`、`admin-management-models-platform-sticky.css`、`admin-overview-metrics-pulse-layout.css`、`admin-management-pills-responsive-fallbacks.css`、`admin-management-pills-commerce-invoices.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十七轮增量：`admin-management-directory-roles-sticky.css`、`admin-management-models-rows-shared-controls.css`、`admin-management-directory-platform-users-sticky.css`、`admin-management-directory-commerce-solutions-sticky.css`、`admin-management-directory-operations-sticky.css`、`admin-management-models-rows-shared-copy.css`、`admin-management-products-capability-summary-metrics.css`、`admin-tenant-detail-config-blocks.css`、`admin-tenant-detail-shell-collapsed.css`、`admin-management-directory-verifications-sticky.css`、`admin-management-directory-commerce-subscriptions-sticky.css`、`admin-management-directory-products-plans-sticky.css`、`admin-management-commerce-transactions-invoices-rows.css`、`admin-shell-nav-collapsed-sidebar.css`、`admin-overview-models-metrics-tags.css`、`admin-management-pills-commerce-payments.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第十八轮增量：`admin-auth-captcha-puzzle-handle.css`、`admin-auth-captcha-puzzle-piece.css`、`admin-auth-captcha-surface-image.css`、`admin-directory-actions-menu.css`、`admin-directory-cards-shell.css`、`admin-directory-layout-page-size.css`、`admin-directory-list-identity.css`、`admin-management-commerce-overview-layout.css`、`admin-management-commerce-overview-links.css`、`admin-management-commerce-subscriptions-actions.css`、`admin-management-commerce-subscriptions-detail-timeline.css`、`admin-management-commerce-subscriptions-list-rows.css`、`admin-management-commerce-transactions-payments-status-tones.css`、`admin-management-core-view.css`、`admin-management-directory-accounts-sticky.css`、`admin-management-directory-commerce-growth-sticky-end.css`、`admin-management-directory-commerce-growth-sticky-start.css`、`admin-management-directory-platform-users-layout.css`、`admin-management-directory-products-solutions-sticky.css`、`admin-management-models-rows-actions-danger.css`、`admin-management-models-shared-commerce-billing.css`、`admin-management-models-shared-commerce-primary.css`、`admin-management-models-shared-payment-commercial.css`、`admin-management-pills-base-account.css`、`admin-management-pills-commerce-orders.css`、`admin-management-pills-commerce-subscriptions.css`、`admin-management-products-capability-summary-shell.css`、`admin-management-tenant-workspace-cards-shell.css`、`admin-management-tenant-workspace-layout.css`、`admin-overview-core-section.css`、`admin-overview-core-tones.css`、`admin-overview-metrics-pulse-tags.css`、`admin-overview-metrics-pulse-values.css`、`admin-overview-models-rows-copy-meta.css`、`admin-overview-models-rows-layout.css`、`admin-overview-models-rows-medals.css`、`admin-overview-service-tips-panel.css`、`admin-permissions-core-domain.css`、`admin-permissions-tree-node-status-layers.css`、`admin-permissions-tree-node-structure.css`、`admin-permissions-tree-node-title-row.css`、`admin-permissions-tree-shell-header.css`、`admin-permissions-tree-workspace-layout.css`、`admin-platform-autonomy-panels-resource-table.css`、`admin-products-summary-toolbar-summary.css`、`admin-roles-permission-dialog-surface.css`、`admin-service-health-catalog-cards-header.css`、`admin-service-health-summary-toolbar-controls-filters-select.css`、`admin-service-health-summary-toolbar-controls-search.css`、`admin-tenant-detail-activity-audit.css`、`admin-tenant-detail-config-kv.css`、`admin-tenant-detail-shell-header-layout.css`、`admin-tenant-detail-shell-header-title-copy.css`、`admin-tenant-detail-shell-summary.css`、`admin-workspace-switcher-dark.css` 已继续拆分为更细 L3/L4 子模块；入口仅保留 `@import`。
   第二阶段第一批：已将第十八轮产生的 106 个 `*-part-N.css` 机械叶子改名为 layout/copy/states/tones/cells/header 等语义叶子；52 个入口继续保持 import-only，admin CSS 文件体积阈值仍低于 1000B，并通过 `ds/no-style-part-leaf` 阻断新增机械叶子命名。
   第二阶段第二批：已按 structure/content/states/controls 融合强耦合小叶子，并拍平父级深度大于等于 5 的过深中间入口；admin CSS 文件数由 1130 收敛到 1000，单文件最大仍为 997B。
   第二阶段第三批：已将低层、全叶子、单父引用且合并后不超过 1.5KB 的 79 个语义入口转为叶子模块，删除 182 个冗余小叶子，并从 `ds/no-style-entry-rules` 中移除这些低层入口和 51 个已不存在入口的 import-only 约束；admin CSS 文件数由 1000 收敛到 818，import-only 入口由 285 收敛到 206，单文件最大为 1499B。
   第二阶段第四批：已将低/中层、全叶子、单父引用且合并前内容不超过 2.6KB 的 80 个语义入口转为叶子模块，删除 275 个冗余小叶子，并从 `ds/no-style-entry-rules` 中移除对应低/中层入口约束；admin CSS 文件数由 818 收敛到 543，import-only 入口由 206 收敛到 126，单文件最大为 2601B。
   第二阶段第五批：已将 2.6KB 到 6KB 区间内、全叶子、单父引用的 56 个中层语义入口转为叶子模块，删除 231 个冗余子叶子，并从 `ds/no-style-entry-rules` 中移除对应入口约束；admin CSS 文件数由 543 收敛到 312，import-only 入口由 126 收敛到 70，单文件最大为 5985B，6KB 内同类候选已清零。
   第二阶段第六批：已将 depth>=4 的 14 个业务子域入口转为叶子模块，删除 70 个冗余子叶子，并从 `ds/no-style-entry-rules` 回收对应中层入口约束；admin CSS 文件数由 312 收敛到 242，import-only 入口由 70 收敛到 56，depth>=4 的全叶子单父候选已清零。
   第二阶段第七批：已将剩余 45 个 depth=3 应用域入口转为叶子模块，删除 166 个冗余子叶子，并从 `ds/no-style-entry-rules` 回收对应入口约束；admin CSS 文件数由 242 收敛到 76，import-only 入口由 56 收敛到 11，仅保留 top-level 聚合边界。
   第二阶段第八批：已将 `globals.css` 直接导入的 7 个具体规则入口补成稳定 wrapper，具体规则迁入 `*-content.css`；admin CSS 文件数由 76 调整到 83，import-only 入口由 11 调整到 18，所有 admin globals 本地样式入口均受 `ds/no-style-entry-rules` 约束。
   第二阶段第九批：已将 website、Varda、Ruyin 的 `globals.css` 本地样式导入统一补成稳定 wrapper，具体规则迁入 `*-content.css`；新增 5 个 wrapper 入口约束，并将 globals 本地 concrete import 守卫从 admin 泛化到所有前端应用。
   第二阶段第十批：已对 admin 7 个 12KB+ 大型具体规则叶子做语义重平衡，拆成 34 个粗粒度业务模块；admin CSS 文件数由 83 调整到 117，import-only 入口由 18 调整到 26，具体规则叶子最大值降到 12KB 以下。
   第二阶段第十一批：已继续对全应用剩余 13 个 8KB+ 具体规则叶子做语义拆分，拆成 49 个更小业务模块；admin CSS 文件数由 117 调整到 166，import-only 入口由 26 调整到 39，具体规则叶子最大值降到 8KB 以下。
5. P1：补强分层 guardrail。状态：已完成并持续收敛；`ds/no-style-entry-rules` 约束 DS style pack、各应用 globals 和 admin 当前保留的高层聚合入口保持 import-only；低/中层语义模块在完成机械拆分后按批次回收为可承载本域规则的叶子模块。验收：`pnpm lint:design` 通过；baseline 仍为空。
   本轮增量：`ds/no-style-entry-rules` 已新增约束 admin assistant messages bubbles、admin service health core、admin management commerce subscriptions list、admin management commerce transactions billing/payments、admin management products capability lists、admin overview models metrics、admin overview metrics pulse 入口保持 import-only。
   第二轮增量：`ds/no-style-entry-rules` 已新增约束 admin operations skills、admin platform autonomy domains/panels、admin auth captcha puzzle、admin shell core actions、admin management directory commerce grids、admin service health summary toolbar controls、admin assistant panel floating、admin management commerce transactions invoices、admin permissions tree node title、admin management tenant workspace cards 入口保持 import-only。
   第三轮增量：`ds/no-style-entry-rules` 已新增约束 admin permissions core cards、admin roles auth dialog、admin management commerce transactions orders、admin overview products rows、admin management products capability detail、admin directory cards、admin tenant detail config review、admin service health catalog list、admin products summary toolbar 入口保持 import-only。
   第四轮增量：`ds/no-style-entry-rules` 已新增约束 admin management pills responsive tenant、admin management models rows actions/shared、admin workspace switcher items、admin management directory commerce transactions sticky、admin shell nav collapsed、admin management core toolbar、admin service health catalog cards、admin management commerce overview risks、admin operations controls、admin management directory roles layout、admin assistant conversation suggestions 入口保持 import-only。
   第五轮增量：`ds/no-style-entry-rules` 已新增约束 admin operations tickets rows、admin overview metrics bands、admin tenant detail config fields、admin tenant detail members table、admin management directory commerce solutions、admin management commerce transactions payments status、admin assistant composer box、admin management pills commerce billing、admin products releases、admin operations announcements、admin shell core brand、admin overview models categories 入口保持 import-only。
   第六轮增量：`ds/no-style-entry-rules` 已新增约束 admin service health catalog checks、admin management commerce transactions dialogs、admin overview core cards、admin management pills products product types、admin management products service plans detail、admin shell nav items links、admin permissions tree shell、admin tenant detail shell actions、admin service health core status、admin management models strategy lists sticky、admin overview service blocks、admin tenant detail shell header title 入口保持 import-only。
   第七轮增量：`ds/no-style-entry-rules` 已新增约束 admin shell nav items sections、admin products plans、admin roles permission dialog header/list、admin management products capability shared、admin management commerce subscriptions list status、admin management models gateway rows、admin operations tickets sticky、admin assistant conversation bar、admin shell responsive、admin management pills products roles、admin overview service data metrics、admin management commerce transactions billing status、admin permissions tree workspace 入口保持 import-only。
   第八轮增量：`ds/no-style-entry-rules` 已新增约束 admin assistant panel mode、admin assistant conversation suggestions buttons、admin shell sidebar assistant、admin management products capability detail related、admin management pills products plans、admin shell core layout/user、admin management models rows pills、admin directory list row、admin management commerce commercial status、admin tenant detail shell metrics、admin roles auth dialog node 入口保持 import-only。
   第九轮增量：`ds/no-style-entry-rules` 已新增约束 admin management commerce receipts、admin tenant detail tabs、admin directory list shell、admin management models strategy rows、admin overview models rows copy、admin management commerce transactions orders status、admin overview core period、admin management models strategy lists alignment、admin management commerce commercial layout、admin workspace switcher items base、admin platform autonomy domains links、admin operations skills cards 入口保持 import-only。
   第十轮增量：`ds/no-style-entry-rules` 已新增约束 admin platform autonomy domains card、admin shell locale、admin service health core page、admin overview models metrics values、admin tenant detail members list row、admin operations dialog body、admin management commerce subscriptions dialog header、admin management pills base status、admin management core toolbar controls、admin overview service tips、admin management commerce transactions invoices status、admin management models shared tenant product 入口保持 import-only。
   第十一轮增量：`ds/no-style-entry-rules` 已新增约束 admin management products capability summary identity、admin tenant detail members list shell/identity、admin management pills products solutions/service plans、admin shell nav collapsed nav、admin management products capability lists rows shell、admin management commerce transactions billing rows、admin governance list sticky、admin tenant detail activity usage/subscriptions、admin service health summary toolbar controls filters、admin management directory commerce transactions sticky start、admin overview service data rankings、admin service health responsive、admin management directory roles layout identity 入口保持 import-only。
   第十二轮增量：`ds/no-style-entry-rules` 已新增约束 admin platform autonomy risks、admin management commerce transactions payments rows、admin service health catalog list table、admin management models shared row cells、admin assistant messages thinking、admin auth captcha states、admin management directory commerce transactions sticky end、admin shell sidebar layout、admin management models gateway sticky、admin overview metrics pulse layout、admin management pills responsive fallbacks、admin management pills commerce invoices 入口保持 import-only。
   第十三轮增量：`ds/no-style-entry-rules` 已新增约束 admin management directory roles/platform users/operations/verifications sticky、admin management directory commerce solutions/subscriptions sticky、admin management directory products plans sticky、admin management models rows shared controls/copy、admin management products capability summary metrics、admin tenant detail config blocks、admin tenant detail shell collapsed、admin management commerce transactions invoices rows、admin shell nav collapsed sidebar、admin overview models metrics tags、admin management pills commerce payments 入口保持 import-only。
   第十四轮增量：`ds/no-style-entry-rules` 已新增约束本轮 55 个 admin CSS 入口保持 import-only：`admin-auth-captcha-puzzle-handle.css`、`admin-auth-captcha-puzzle-piece.css`、`admin-auth-captcha-surface-image.css`、`admin-directory-actions-menu.css`、`admin-directory-cards-shell.css`、`admin-directory-layout-page-size.css`、`admin-directory-list-identity.css`、`admin-management-commerce-overview-layout.css`、`admin-management-commerce-overview-links.css`、`admin-management-commerce-subscriptions-actions.css`、`admin-management-commerce-subscriptions-detail-timeline.css`、`admin-management-commerce-subscriptions-list-rows.css`、`admin-management-commerce-transactions-payments-status-tones.css`、`admin-management-core-view.css`、`admin-management-directory-accounts-sticky.css`、`admin-management-directory-commerce-growth-sticky-end.css`、`admin-management-directory-commerce-growth-sticky-start.css`、`admin-management-directory-platform-users-layout.css`、`admin-management-directory-products-solutions-sticky.css`、`admin-management-models-rows-actions-danger.css`、`admin-management-models-shared-commerce-billing.css`、`admin-management-models-shared-commerce-primary.css`、`admin-management-models-shared-payment-commercial.css`、`admin-management-pills-base-account.css`、`admin-management-pills-commerce-orders.css`、`admin-management-pills-commerce-subscriptions.css`、`admin-management-products-capability-summary-shell.css`、`admin-management-tenant-workspace-cards-shell.css`、`admin-management-tenant-workspace-layout.css`、`admin-overview-core-section.css`、`admin-overview-core-tones.css`、`admin-overview-metrics-pulse-tags.css`、`admin-overview-metrics-pulse-values.css`、`admin-overview-models-rows-copy-meta.css`、`admin-overview-models-rows-layout.css`、`admin-overview-models-rows-medals.css`、`admin-overview-service-tips-panel.css`、`admin-permissions-core-domain.css`、`admin-permissions-tree-node-status-layers.css`、`admin-permissions-tree-node-structure.css`、`admin-permissions-tree-node-title-row.css`、`admin-permissions-tree-shell-header.css`、`admin-permissions-tree-workspace-layout.css`、`admin-platform-autonomy-panels-resource-table.css`、`admin-products-summary-toolbar-summary.css`、`admin-roles-permission-dialog-surface.css`、`admin-service-health-catalog-cards-header.css`、`admin-service-health-summary-toolbar-controls-filters-select.css`、`admin-service-health-summary-toolbar-controls-search.css`、`admin-tenant-detail-activity-audit.css`、`admin-tenant-detail-config-kv.css`、`admin-tenant-detail-shell-header-layout.css`、`admin-tenant-detail-shell-header-title-copy.css`、`admin-tenant-detail-shell-summary.css`、`admin-workspace-switcher-dark.css`。
   第二阶段第三批：已把低层全叶子语义模块从 import-only 入口约束中回收为叶子模块，并清理已不存在 CSS 文件的陈旧约束；`ds/no-style-entry-rules` 继续只约束高层聚合入口，低层文件可以承载本域规则，但仍受应用 CSS token、尺度、原生控件和机械命名规则约束。
   第二阶段第四批：已继续把低/中层全叶子语义模块从 import-only 入口约束中回收为叶子模块；当前 2.6KB 以内的同类候选已清零，`ds/no-style-entry-rules` 保持约束高层聚合入口。
   第二阶段第五批：已继续把 2.6KB 到 6KB 区间内的中层全叶子语义模块从 import-only 入口约束中回收为叶子模块；当前 6KB 以内的同类候选已清零，剩余 import-only 入口主要保留高层聚合边界。
   第二阶段第六批：已继续把 depth>=4 的业务子域聚合入口回收为叶子模块，并补回 7 个仍需保留的高层聚合入口 guardrail；当前保留的 import-only 入口与 `ds/no-style-entry-rules` 完全对齐。
   第二阶段第七批：已继续把 depth=3 应用域聚合入口回收为叶子模块；当前 `ds/no-style-entry-rules` 只约束 11 个 admin top-level 聚合入口，admin CSS 依赖图无缺失 import、无陈旧 guardrail。
   第二阶段第八批：已新增 `ds/no-admin-global-concrete-style-import`，要求 admin `globals.css` 只能导入受 `ds/no-style-entry-rules` 约束的稳定入口；新增的 `*-content.css` 承载具体规则，入口层保持 import-only。
   第二阶段第九批：已将守卫升级为 `ds/no-global-concrete-style-import`，覆盖 `portals/*`、`agent-studio/*`、`business/*` 的 `globals.css` 本地样式导入；website、Varda、Ruyin 的本地入口层已对齐 import-only；同时新增 `ds/no-stale-style-entry-rules`，防止 import-only 入口约束指向不存在文件。
   第二阶段第十批：已新增 `ds/no-large-extracted-style-leaf`，应用 `src/styles` 中承载具体规则的叶子文件超过 12KB 会失败；import-only 聚合入口不受该阈值限制。
   第二阶段第十一批：`ds/no-large-extracted-style-leaf` 阈值已从 12KB 收紧到 8KB；全应用当前没有超过 8KB 的具体规则叶子，import-only 聚合入口继续豁免。
   第二阶段第十二批：已新增 CSS 图谱守卫，`ds/no-missing-css-import` 拦截断链相对 `@import`，`ds/no-unreachable-app-style-module` 要求应用 `src/styles/*.css` 必须能从对应 `src/app/globals.css` 图谱到达。
   第二阶段第十三批：已折叠 admin 5 个单用途 `*-content.css` 中间 wrapper，将子模块 import 上移到稳定入口；admin CSS 文件数由 166 收敛到 161，import-only 入口由 39 收敛到 34，具体规则叶子保持 127 且无 8KB+ 叶子。
   第二阶段第十四批：已将剩余 11 个当前 CSS 文件名中的 `content` 语义残留重命名为 modal/surface/target/handle、metrics/domains/panels/risks、page/main/core 等业务语义名；admin CSS 图谱保持 161 个文件、34 个 import-only 入口、127 个具体规则叶子且无 8KB+ 叶子。
   第二阶段第十五批：已新增 `ds/no-redundant-style-wrapper`，非 `globals.css` 直连的应用 `src/styles` import-only wrapper 若只转发一个子模块会失败，防止单子中间层回流。
   第二阶段第十六批：已将 website、Varda、Ruyin 当前 5 个 `*-content.css` 样式叶子改名为业务语义文件：marketing assembly、legal pages、chat shell、tool result、base document；应用入口继续保持 import-only，只做本应用组装，不把业务页面结构继续下沉到 DS。
   第二阶段第十七批：已拆分 DS `platform-content.css` 泛化模块，按 brand hero、navigation tabs、data table、toolbar、responsive 五个职责承接规则；`platform.css` 继续作为 import-only style pack 入口。同步新增 `ds/no-generic-content-style-module`，阻止 DS 和应用样式模块重新出现 `*-content.css` 泛化命名。
   第二阶段第十八批：已大幅拆分 DS platform 大模块，`platform-access.css`、`platform-account.css`、`platform-shell.css`、`platform-shell-header.css`、`platform-layout.css`、`platform-models.css`、`platform-tenant-settings.css`、`platform-notifications.css` 均转为 import-only 聚合入口，具体规则按 shell/list/identity/actions/profile/cards/dialogs/header/bindings/table/controls/responsive 等职责沉淀到子模块；新增 `ds/no-large-platform-style-leaf`，要求 DS `platform-*` 具体规则叶子不超过 8KB。
   第二阶段第十九批：已拆分 DS Console style pack 中 3 个 8KB+ 大模块，`console-tenant-switcher.css`、`console-shell-layout.css`、`console-shell-chrome.css` 均转为 import-only 聚合入口，具体规则按 trigger/panel/actions/dialog、frame/sidebar/nav/header、surface/header/sidebar/nav/assistant 等职责沉淀到子模块；新增 `ds/no-large-console-style-leaf`，要求 DS `console-*` 具体规则叶子不超过 8KB。
   第二阶段第二十批：已拆分 DS 公共 `components.css` 与 `auth.css` 大模块，两者均转为 import-only 公共入口；组件规则按 button/fields/display/shell tools/preferences/user menu/footer switch 拆分，认证规则按 page shell/header locale/visual/form/fields/actions/tabs/signup/captcha/responsive 拆分。同步新增 `ds/no-large-components-style-leaf` 与 `ds/no-large-auth-style-leaf`，要求 DS `components-*`、`auth-*` 具体规则叶子不超过 8KB。
6. P2：文档与模板同步。状态：进行中；文档体系已迁移到 `docs/packages` / `docs/standards` / `docs/audit`，本轮同步 DS README、包说明、使用规范、组件清单、包 exports、消费者规范。验收：版本、组件数量、公共导出入口一致；新应用模板默认接入 DS globals、ThemeProvider、质量门禁和 guardrail。

## 维度一：DS 系统自身规范性

### DS-SYS-001：守卫脚本覆盖范围不足

优先级：P0  
状态：已修复。  
修复证据：`scripts/guardrails/check-design-system.mjs` 已扫描 `portals`、`packages`、`agent-studio`、`business`，并把前端源码规则从 portal 扩展到业务/agent 前端工作区。  
问题：历史上 `agent-studio/varda` 和历史 Ruyin 业务应用的样式违规不会被 `pnpm lint:design` 拦截；P7b 后 Ruyin 已迁出本仓。
修复方向：将 guardrail 扫描根扩展到所有前端/业务工作区：`portals`、`agent-studio`、`business`，必要时排除纯后端目录。  
验收标准：历史 Ruyin 样式已由迁移前规则覆盖；当前本仓继续捕获 `agent-studio/varda` 的 inline font/style 问题。
当前验收：`pnpm lint:design` 通过。

### DS-SYS-002：DS token 存在 TS 与 CSS 两套人工维护源

优先级：P0  
状态：已修复。  
修复证据：`styles/tokens.css` 是运行时 token 值源；`src/tokens/colors|spacing|radius|shadow|typography.ts` 已改为只暴露 `var(--vx-*)` 引用，不再重复维护 hex/px/shadow 值。`lint:design` 已新增 `ds/no-token-runtime-value-duplicates`，阻止 TS token 文件重新写运行时值。  
问题：TS tokens 只覆盖基础集合，CSS tokens 还包含 auth、shell、section、hero 等大量语义值，两边不是生成关系，存在漂移风险。  
修复方向：建立单一 token source。建议以结构化 TS/JSON 为源，生成 `tokens.css`、Tailwind `@theme` 映射和类型导出。  
验收标准：新增或修改 token 只能改一处源文件；构建生成 CSS 与类型；CI 校验生成产物一致。  
当前验收：`pnpm lint:design`、`@vxture/design-system` type-check/build 通过。

### DS-SYS-003：Tailwind `@theme` 只映射颜色，未完整映射 radius/spacing/shadow/typography

优先级：P0  
状态：已修复。  
修复证据：`tokens.css` 的 `@theme` 已补齐 `--spacing-vx-*`、`--radius-vx-*`、`--shadow-vx-*`、`--text-vx-*` 映射。  
问题：颜色已基本收敛，但间距、圆角、阴影、字号还没有完全进入 DS token 体系。  
修复方向：补齐 `--spacing-vx-*`、`--radius-vx-*`、`--shadow-vx-*`、`--text-vx-*` 等 Tailwind v4 token 映射，并迁移 DS 组件内部 class。  
验收标准：DS 基础组件不再依赖 Tailwind 默认设计尺度；应用层新增组件只能使用 `vx-*` token class 或 DS 组件。  
当前验收：`@vxture/design-system` type-check/build 通过。

### DS-SYS-004：DS 组件 CSS 内仍有硬编码布局尺度

优先级：P1  
状态：已闭合，进入持续收敛。  
修复证据：`packages/design/design-system/src/styles/tokens.css` 已新增 `--vx-button-*`、`--vx-field-*`、`--vx-card-*`、`--vx-shell-*`、`--vx-switch-*` 等语义组件尺度 token；`packages/design/design-system/src/styles/components.css` 已清除对 `var(--vx-component-metric-*)` 的直接消费；`scripts/guardrails/check-design-system.mjs` 已新增 `ds/no-component-metric-in-ds-components-css`，禁止 DS 基础组件语义类绕过语义 token 层。  
问题：`--vx-component-metric-*` 现在只应作为 DS token 层的尺度兜底池，不应成为组件 CSS 或应用侧的直接使用契约；`platform-*` 分层模块中仍存在少量过渡性直用，后续需要按业务域逐步提升为 `--vx-<domain>-*` / `--vx-<component>-*` 语义 token。
修复方向：保持 `raw value -> component metric fallback -> semantic component token -> semantic class/component` 的分层关系。新增或修改 DS 组件时，必须先补语义 token，再在组件样式中消费；治理 `platform-*` 模块时按 L2/L3/L4 边界迁移，优先把重复 radius、font-size、gap、padding、shadow 抽成域语义 token。
验收标准：`components.css` 中 `var(--vx-component-metric-*)` 命中数持续为 0；新增 DS 语义类不得直接消费兜底 metric token；每轮 `platform-*` 治理都减少直接 metric token 命中或把命中提升为更明确的域语义 token。
当前验收：`rg -n -- "var\\(--vx-component-metric" packages/design/design-system/src/styles/components.css` 无结果；`pnpm lint:design`、`@vxture/design-system` type-check/build、website/console/admin/agent-studio-varda build 均通过。

### DS-SYS-005：包导出与应用别名策略混用 dist/src

优先级：P1  
状态：已修复。  
修复证据：`@vxture/design-system` 已提供 `.`、`/tokens`、`/types`、`/server` 公共入口；portal dev/build alias 已从 `dist/index.mjs` 改为 `src/client.ts`，并通过 `transpilePackages` 编译 source。CSS 仍通过 package exports 暴露稳定样式入口。  
问题：JS 和 CSS 的消费边界不一致；本地开发依赖 DS 先 build，容易出现源码已改但消费方仍使用旧 dist 的问题。  
修复方向：统一开发与构建策略。可选方案：应用 dev 期使用 source + `transpilePackages`，生产使用 package exports；或在 dev-tools 中强制 DS watch build。  
验收标准：修改 DS 组件后，portal dev 无需手动 build 即可生效；CI 构建仍从 package 公共入口消费。  
当前验收：website/console/admin/agent-studio-varda type-check/build 通过；Ruyin 迁移前验证记录由外部业务仓承接。

### DS-SYS-006：`@vxture/design-system/*` tsconfig wildcard 暴露了潜在深层导入通道

优先级：P1  
状态：已修复。  
修复证据：`portals/website/tsconfig.json`、`portals/console/tsconfig.json`、`portals/admin/tsconfig.json` 已删除 `@vxture/design-system/*` wildcard，只保留根入口类型映射。  
问题：虽然当前源码未发现深层导入，但 wildcard 会绕开“只从根入口导入”的规范。  
修复方向：删除应用 tsconfig 中的 DS wildcard，或只保留明确允许的 CSS 子路径类型映射。  
验收标准：业务代码只能 `import { Button } from '@vxture/design-system'`；样式只能按 package exports 允许路径导入。  
当前验收：源码扫描未发现 `@vxture/design-system/src/**` 或未授权 DS 深层导入。

### DS-SYS-007：DS 根入口整体注入 `"use client"`，客户端边界过粗

优先级：P1  
状态：已修复。  
修复证据：`tsup.config.ts` 只给 dist `index` 主组件入口注入 `"use client"`；`/tokens`、`/types`、`/server` 子入口保持 server-safe。source dev 入口使用 `src/client.ts`，不污染 server-safe 子入口。  
问题：tokens、types、utils 等本可 server-safe 的导出也被客户端化；Next Server Component 中引入类型/常量时容易扩大客户端边界。  
修复方向：拆分入口：`@vxture/design-system` 可保持组件客户端入口，同时提供 `@vxture/design-system/tokens`、`/types`、`/server` 等无 client 指令入口。  
验收标准：服务端可安全导入 token/type，不触发 client boundary。  
当前验收：`@vxture/design-system` build 生成 `index`、`tokens`、`types`、`server` 四个入口且无 client directive 警告。

### DS-SYS-008：Auth 样式双源重复治理

优先级：P0  
状态：已修复。  
修复证据：`.vx-auth-*`、`.vx-signup-*`、`.vx-captcha-*` 样式源已回收到 `packages/design/design-system/src/styles/auth.css`；`website` / `console` 应用层不再定义这些选择器。  
问题：登录模板已抽象，但样式仍存在 DS 与应用双源，后续 website/console/admin 登录视觉会继续漂移。  
修复方向：删除应用层重复 `.vx-auth-*` 样式，仅保留应用特有页面样式；如确有差异，回收到 DS props 或 auth semantic tokens。  
验收标准：`website`、`console` 不再定义 `.vx-auth-*`；登录页样式只由 DS auth.css 控制。

### DS-SYS-009：DS 文档与真实实现不一致

优先级：P1  
状态：已修复。  
修复证据：`docs/40-implementation/packages/design/design-system.md` 与 `docs/10-standards/design-system.md` 已承接 DS 包说明和使用规范；样式入口、目录结构、消费者范围、AI 规则和 guardrail 禁止项与当前实现对齐。  
问题：文档无法作为开发约束依据，AI/人工开发会根据旧结构生成错误代码。  
修复方向：更新包说明、使用规范与审计记录，并把 guardrail 规则、禁止项、允许项写入文档。  
验收标准：文档结构、包版本、导出入口、样式入口和实际文件一致。

### DS-SYS-010：DS 二级文档与包实现再次出现漂移

优先级：P2
状态：已修复，进入持续同步。
证据：`packages/design/design-system/README.md`、`docs/40-implementation/packages/design/design-system.md`、`docs/10-standards/design-system.md` 已同步到包版本 `1.3.0`、47 个 UI 组件、5 个 AI 组件、当前 package exports 和 CSS 分层入口；旧架构层 DS 专项文档已由文档体系迁移移除。
问题：包 README、包说明和使用规范一旦与实际实现漂移，会继续误导 AI/人工开发，尤其会弱化“DS 不足先补 DS”的执行依据。
修复方向：以 `package.json`、公共导出入口和 `src/components/ui` 实际清单为准；新增 DS export、style entry、组件或 guardrail 时同步 README、`docs/40-implementation/packages/design/design-system.md`、`docs/10-standards/design-system.md`、`docs/60-operations/audit/checklist-ds.md`。
验收标准：DS README、包说明、使用规范、包版本、组件数量、公共导出清单一致；仓库中不再出现旧版本号、旧组件数量或已删除架构文档口径。

### DS-SYS-011：DS 守卫只管源码 import，尚未约束应用依赖清单

优先级：P1
状态：已修复。
修复证据：`scripts/guardrails/check-design-system.mjs` 已新增 `ds/no-app-ui-engine-dependencies`，扫描应用 `package.json` 并禁止声明 `@phosphor-icons/react`、`lucide-react`、`react-icons`、`@radix-ui/*`；`portals/admin` 与 `portals/console` 已移除 `@phosphor-icons/react` 直依赖。
原证据：业务源码未直接导入 `@phosphor-icons/react`、`lucide-react`、`react-icons`、`@radix-ui/*`，但 `portals/admin/package.json` 与 `portals/console/package.json` 曾声明 `@phosphor-icons/react`。
问题：源码 import 已收敛到 DS `Icon`，但依赖层没有封口；后续页面仍可绕过 DS 重新直接使用底层图标库，且依赖关系无法表达“底层 UI 引擎只属于 DS 内部”。
修复方向：扩展 `scripts/guardrails/check-design-system.mjs`，扫描 `portals/*`、`business/*`、`agent-studio/*` 的 `package.json`，禁止应用声明底层 UI 引擎依赖；`@phosphor-icons/react`、Radix、图标库等只能出现在 `@vxture/design-system`。
验收标准：`rg -n "@phosphor-icons/react|lucide-react|react-icons|@radix-ui/" portals business agent-studio --glob "package.json"` 无结果；新增应用依赖会被 `pnpm lint:design` 阻断。

## 维度二：DS 使用规范性

### DS-USE-001：历史 Ruyin 业务应用未接入 DS，仍是独立样式系统

优先级：P0  
状态：已修复。  
修复证据：迁移前 Ruyin 已加入 `@vxture/design-system`，根布局接入 `ThemeProvider` / `FullscreenProvider`，全局入口改为 DS globals + Ruyin base 样式组合，主页改用 DS Button/Card/Badge。P7b 后 Ruyin 已迁出本仓。
问题：Ruyin 作为租户侧业务应用，应与 website/console 同登录态、同视觉系统，但当前 UI 完全独立。  
修复方向：为历史 Ruyin 应用增加 DS 依赖，引入 DS globals，删除私有颜色变量和按钮样式，使用 DS Button/Card/Badge/Layout。
验收标准：历史 Ruyin 迁移前已不再定义颜色、字体、按钮基础样式；后续由 `vxture/agentstudio-ruyin` 维护。
当前验收：迁移前 Ruyin type-check/build 通过。

### DS-USE-002：`agent-studio/varda` 大量 inline style，未组件化使用 DS

优先级：P1  
状态：已修复。  
修复证据：`agent-studio/varda/src/components/*` 核心聊天组件已改用语义 CSS class 与 DS Button/Badge/Textarea；`rg -n "style=\\{\\{|<button|<input|<select|<textarea" agent-studio/varda/src` 无结果。  
问题：虽然引入了 `@vxture/design-system/styles/globals.css`，但实际 UI 仍主要是手写样式，难以统一密度、主题和可访问性。  
修复方向：分批把常用结构回收为 DS 能力：ChatShell、MessageBubble、ToolCallCard、ConfirmDialog、InputComposer，或至少使用 DS Button/Input/Card/Badge。  
验收标准：agent-studio 基础交互不再依赖大段 inline style；ThemeProvider/DensityProvider 与门户一致。  
当前验收：`@vxture/agent-studio-varda` type-check/build 通过。

### DS-USE-003：`agent-studio/varda` 字体加载不完整

优先级：P1  
状态：已修复。  
修复证据：`agent-studio/varda/src/app/layout.tsx` 已按平台标准加载 Funnel Display / Inter / Geist Mono 字体变量，并接入 `ThemeProvider`、`FullscreenProvider`；body 不再 inline 设置字体。
问题：`var(--font-sans)` 依赖应用层加载器变量，Varda 未提供，实际字体可能回退不可控。  
修复方向：要么复用统一 AppFontProvider/RootLayout helper，要么在 Varda layout 中按平台标准加载字体变量。  
验收标准：所有前端应用字体加载逻辑一致，body 不再 inline 设置字体。

### DS-USE-004：console/admin 构建关闭了 lint/type 错误拦截

优先级：P0  
状态：已修复。  
修复证据：`portals/console/next.config.js` 与 `portals/admin/next.config.js` 已移除 `eslint.ignoreDuringBuilds`、`typescript.ignoreBuildErrors`。  
问题：即使 DS 使用违规或类型错误出现，build 也可能通过，削弱 DS 治理。  
修复方向：完成存量问题修复后关闭 ignore；短期至少在 CI 显式跑 `pnpm --filter @vxture/console type-check/lint` 与 admin 对应命令。  
验收标准：console/admin build 不忽略 lint/type；CI 失败能阻断违规合入。  
当前验收：`@vxture/console` 与 `@vxture/admin` lint/type-check/build 均通过。

### DS-USE-005：console/admin 全局 CSS 仍过大，平台样式没有完全回收 DS

优先级：P1  
状态：已闭合，转入持续巡检。  
证据：`console/admin` shell、tabs、table、toolbar 与模块级尺寸/通知 token 已回收到 DS `platform.css` / `tokens.css`；DS 已补齐 `DataTable`、`FilterBar`、`ActionMenu`、`Pagination`、`DialogForm`、`StatusBadge`、`MetricCard` 并从公共入口导出。应用层 `--vx-*` token 定义、原生基础控件、原生表格、设计型 inline style 和硬编码尺度 baseline 均为 0。  
问题：历史上全局 CSS 承载了 shell、表格、过滤器、弹窗、操作菜单、分页等实际设计系统能力；当前主要风险已从存量违规转为新增页面重新自建控件、尺度或私有 token。  
修复方向：通用结构一律先补 DS，再迁移应用调用；应用 CSS 仅保留业务语义布局、状态编排和必要动态变量，不得定义 `--vx-*` token、不得写基础控件样式、不得新增硬编码设计尺度。  
验收标准：`pnpm lint:design` 通过且 baseline 为空；portal globals.css 不承担通用控件实现；新增列表、工具栏、弹窗、菜单、分页、表格必须优先使用 DS 组合组件。  
当前进展：console `MetricGrid` / `TableToolbar` / 发票表格 / Members-Roles 行操作与工作流弹窗已迁移到 DS；admin 高频列表、交易域、商业运营域、运营支持域、权限治理域、AI 配置域已迁移到 DS `ActionMenu` / `Pagination` / `DialogForm`；admin shell、assistant、permissions、service health、operations、overview、commerce、directory、tenant detail、models、pills、products 样式入口已拆为 import-only 聚合入口和分层 domain 模块；ServiceHealth 和 agent-studio/varda 工具调用结果表格已迁移到 DS `DataTable`。

### DS-USE-006：admin/console/website/历史 Ruyin/agent-studio 原生基础控件迁移到 DS

优先级：P1  
状态：已修复。  
证据：迁移前对 portals、Ruyin 与 `agent-studio/varda` 的源码扫描无原生基础控件残留；P7b 后 Ruyin 已迁出本仓。
问题：DS 已有 Button/Input/Select/Checkbox/Badge/Card，但模块内仍手写原生控件和 class，交互状态、焦点、密度、禁用态不统一。  
修复方向：优先迁移列表页工具栏、筛选器、分页、行操作菜单和弹窗表单。DS 不足时先补 DS 能力，再迁移应用。  
验收标准：业务模块不再手写基础按钮/输入框样式；新增页面必须使用 DS primitives 或 DS 业务组件。  
当前验收：admin、console、website、agent-studio/varda 业务源码不再直接写原生 `button/input/select/textarea`；新增原生基础控件会被 `pnpm lint:design` 阻断。Ruyin 后续由 `vxture/agentstudio-ruyin` 维护。

### DS-USE-007：website 仍有若干 Tailwind 拼写错误/历史类

优先级：P0  
状态：已修复。  
修复证据：`SolutionSection.tsx`、`CTASection.tsx`、`StatsSection.tsx` 的 `tranvx-*` 已修复为 `translate-*`，guardrail 增加 `ds/no-known-tailwind-typo` 检查。  
问题：这些类明显是 `translate-*` 被错误替换，属于视觉行为 bug，且 guardrail 当前没有捕获。  
修复方向：立即修正为 Tailwind 正确类，并给 guardrail 增加已知 typo 检测。  
验收标准：`rg -n "tranvx"` 无结果；相关页面 hover/定位恢复正常。

### DS-USE-008：website 还有应用级 auth/signup/reset/verify 样式残留

优先级：P1  
状态：样式源已回收到 DS；认证页面组件形态仍需继续收敛。  
修复证据：`.vx-signup-*` 与 `.vx-captcha-*` 已回收到 DS auth 样式；website 的 `LoginForm`、`ResetPasswordForm`、`VerifyForm`、`SignupForm`、`SliderCaptcha` 与 console 的 `LoginForm`、`SliderCaptcha` 已迁移到 DS `Button` / `Input`，默认登录背景也从 inline 变量收回到 DS `.vx-auth-page--default-bg`；`website` 仅保留法律内容页 `.vx-legal-*` 等非认证业务页面样式。  
问题：登录主模板已抽象，但注册、重置、验证、人机验证仍部分停留在 website 样式层。  
修复方向：把 signup/reset/verify/captcha 回收到 DS auth 模块，或建立 DS AuthFlow 子组件。  
验收标准：website auth 相关 CSS 不再自建基础控件样式，仅传配置、文案、回调。  
当前验收：website / console auth 组件已无原生 `button/input/select/textarea`，SliderCaptcha 仅保留滑块坐标类动态 inline style。

### DS-USE-009：docs 与目录说明仍鼓励应用级 `ui/`

优先级：P1  
状态：已修复。  
修复证据：`portals/website/portals/website/DIRECTORY_STRUCTURE.md` 与 `portals/console/console_ui_framework.md` 已改为禁止应用自建 `ui/` / `primitives/` 基础组件目录，DS 不足时先补 DS。  
问题：与最新原则“优先 DS，不足先补 DS，禁止应用自建基础组件”冲突。  
修复方向：更新或废弃过期文档，明确应用侧只能有语义业务组件目录。  
验收标准：文档中不再出现建议应用自建基础 primitives 的表述。

### DS-USE-010：历史 Ruyin 不在当前 DS guardrail 扫描内，且违反颜色/字体规则

优先级：P0  
状态：已修复。  
修复证据：迁移前 Ruyin 全局样式已改为 import-only；Ruyin 应用级 body 基线移入业务 base 样式，仅消费 DS token，不再维护私有颜色/字体/按钮样式。P7b 后 Ruyin 已迁出本仓。
问题：这正是 DS 守卫要禁止的内容，但当前脚本未扫描 `business`。  
修复方向：与 DS-SYS-001 合并处理，扩展扫描根后再迁移 Ruyin。  
验收标准：扩展守卫后，未迁移的 Ruyin 会导致 `pnpm lint:design` 失败；迁移完成后通过。

### DS-USE-011：应用侧 inline style 规则分类与设计型收敛

优先级：P2  
状态：已修复。  
修复证据：`scripts/guardrails/check-design-system.mjs` 已新增 `ds/no-inline-design-style`，允许 CSS 变量、坐标、transform、背景图片等动态值，拦截颜色、字体、间距、圆角、阴影等设计值；存量设计型 inline style 已清零。  
问题：部分 inline style 是合理动态值，部分是基础样式逃逸；当前没有白名单/黑名单区分。  
修复方向：规则上只允许动态变量类 style，例如 CSS variable、坐标、百分比、背景图 URL；禁止颜色、字体、圆角、阴影、固定间距。  
验收标准：guardrail 能区分合理动态 style 与样式逃逸。  
当前验收：`pnpm lint:design` 通过；inline design style 存量签名为 0，baseline 为空。

### DS-USE-012：DS usage 约束尚未覆盖 native primitive 使用

优先级：P2  
状态：已修复。  
修复证据：`scripts/guardrails/check-design-system.mjs` 已新增 `ds/no-native-primitive` 与 `ds/no-native-table`，业务源码新增 `<button>`、`<input>`、`<select>`、`<textarea>`、`<table>`、`<thead>`、`<tbody>`、`<tr>`、`<th>`、`<td>` 会被拦截；native primitive 存量签名为 0。  
问题：应用可以绕过 DS 组件直接写原生控件，继续形成私有交互样式。  
修复方向：新增 lint 规则：业务模块默认禁止原生表单控件，允许 DS 内部、极少数无样式语义控件、或带注释白名单。  
验收标准：新增页面直接写原生基础控件会被拦截。  
当前验收：`pnpm lint:design` 通过；新增原生基础控件和原生表格会失败，native primitive 存量签名为 0。

### DS-USE-013：应用层存在绕过 DS 的底层 UI 引擎直接导入风险

优先级：P1  
状态：已修复。  
修复证据：admin shell 与 AI 模块已统一通过 DS `Icon` 使用 Phosphor 图标；`lint:design` 新增 `ds/no-direct-ui-engine-imports`，禁止应用层直接导入 `@phosphor-icons/react`、`lucide-react`、`react-icons`、`@radix-ui/*`。  
问题：即使 DS 已提供 Icon/Popover/Tooltip 等能力，应用仍可能直接 import 底层库，导致图标命名、尺寸、可访问性和后续替换策略不可控。  
修复方向：底层 UI 引擎只允许 DS 内部注册和封装，业务应用仅消费 `@vxture/design-system` 公共入口。  
验收标准：`rg -n "@phosphor-icons/react|lucide-react|react-icons|@radix-ui/" portals business agent-studio --glob "*.ts" --glob "*.tsx"` 无结果；新增直接导入会被 `pnpm lint:design` 阻断。

### DS-USE-014：应用层 `--vx-*` 私有 token 清零

优先级：P0  
状态：已修复。  
修复证据：`scripts/guardrails/check-design-system.mjs` 已新增 `ds/no-app-vx-token-definitions`，应用 CSS 新增 `--vx-*` token 定义会被拦截；存量应用层 `--vx-*` token 定义已迁移到 DS 或移除。  
证据：`rg -n --glob "*.css" -- "--vx-[\\w-]+\\s*:" portals/admin/src portals/console/src portals/website/src business agent-studio` 无结果。  
问题：应用层虽然大量使用 DS token 值，但仍通过 `--vx-console-*`、`--vx-admin-*`、`--vx-shell-*`、模块级 `--vx-*` 变量维护私有 token 层，等价于在应用内复制一套设计系统。  
修复方向：把跨应用 shell、table、toolbar、pagination、action menu、dialog form、metric card 等变量回收到 DS semantic/component tokens；业务确有临时局部变量时不得使用 `--vx-*` 前缀。  
验收标准：应用全局 CSS 不再新增 `--vx-*` token；baseline 中 `ds/no-app-vx-token-definitions` 数量保持为 0。

### DS-USE-015：应用 CSS 硬编码尺度零 baseline

优先级：P1  
状态：已修复，baseline 清零。  
修复证据：`scripts/guardrails/check-design-system.mjs` 已新增 `ds/no-app-hardcoded-scale`，应用 CSS 新增硬编码 `px/rem/em` 设计尺度会被拦截；媒体查询、grid/minmax 等布局算法和 1px hairline 已按白名单处理；`scripts/guardrails/design-system-baseline.json` 当前 `allowed: []`。  
问题：应用 CSS 硬编码尺度会绕过 DS token、密度和主题调节能力，是应用侧复制设计系统的主要入口之一。  
修复方向：保持零 baseline；新增尺寸、间距、字号、圆角、阴影必须使用 DS token、Tailwind `vx-*` token class 或 DS 组件语义样式。确需布局算法时使用白名单模式，并避免承载视觉设计值。  
验收标准：`pnpm lint:design` 能阻断新增硬编码尺度签名；baseline 保持为空。  
当前验收：`pnpm lint:design` 通过；`design-system-baseline.json` 当前无存量尺度签名。

### DS-USE-016：应用依赖清单仍可绕过 DS 引入底层 UI 引擎

优先级：P1
状态：已修复。
修复证据：`portals/admin/package.json`、`portals/console/package.json` 和 `pnpm-lock.yaml` 已移除应用层 `@phosphor-icons/react` 依赖；`pnpm lint:design` 已能阻断应用重新声明底层 UI 引擎依赖。
原证据：`portals/admin/package.json` 与 `portals/console/package.json` 曾声明 `@phosphor-icons/react`；当前源码没有直接 import，但依赖清单仍暴露绕过 DS 的入口。
问题：DS 使用合规不能只看源码 import，也要看依赖边界。应用一旦直接依赖图标库或 Radix 等底层 UI 引擎，就会削弱 DS 对图标命名、尺寸、可访问性、主题和替换策略的控制。
修复方向：删除应用层底层 UI 引擎依赖；需要图标、弹层、选择器、Tooltip、Popover 等能力时，统一通过 `@vxture/design-system` 公共入口消费。DS 不足时先补 DS，再迁移应用调用。
验收标准：应用 `package.json` 不再声明 `@phosphor-icons/react`、`lucide-react`、`react-icons`、`@radix-ui/*`；应用源码只从 `@vxture/design-system`、`@vxture/design-system/tokens`、`@vxture/design-system/types`、`@vxture/design-system/server` 和允许的 `styles/*` 入口消费 DS。

### DS-USE-017：DS 消费者质量门禁尚未完全一致

优先级：P1
状态：已修复，进入新增消费者持续巡检。
证据：`website` / `console` / `admin` / `agent-studio/varda` / `agent-studio/agent-template` / `@vxture/design-system` 均已提供真实 lint 脚本；历史 Ruyin 迁移前也已提供真实 lint 脚本，P7b 后由外部业务仓库维护。`agent-studio/agent-template` 的 `build` 已改为 `tsc --noEmit`，不再使用占位命令。
问题：历史上 `pnpm lint:design` 已覆盖 DS 规则，但常规 lint 门禁不一致会让 React、可访问性、未使用代码、Hook 规则等应用级质量问题绕过部分 DS 消费者。
修复方向：保持所有 DS 消费者具备 `type-check` / `lint` / `build` 门禁；新增前端应用或模板时，必须同步接入 ESLint、TypeScript、DS globals、ThemeProvider 与 `pnpm lint:design`。
验收标准：所有 DS 消费者的 lint 脚本都执行真实 ESLint 检查；`pnpm lint:design` 与受影响消费者的 `lint` / `type-check` / `build` 均可作为独立批次验收门禁。

### DS-USE-018：DS 应用调用入口白名单

优先级：P1
状态：已修复，需随 DS exports 持续同步。
证据：`scripts/guardrails/check-design-system.mjs` 已固化 `ALLOWED_DS_IMPORTS`：`@vxture/design-system`、`/tokens`、`/types`、`/server` 和明确允许的 `styles/*`；当前扫描未发现未授权 DS 深层导入，应用侧 DS 样式只从 `@vxture/design-system/styles/globals.css` 引入，本地样式通过应用 `globals.css` 聚合到分层模块。
问题：随着 `/tokens`、`/types`、`/server`、`styles/*` 子入口增加，应用侧容易把“允许的公共子入口”和“禁止的内部深层路径”混淆。
修复方向：每次新增 DS package export 时，同步更新 package exports、守卫白名单、消费者文档和 tsconfig alias 策略；其他 `@vxture/design-system/*` 默认禁止。
验收标准：新增 `@vxture/design-system/src/**` 或未列入白名单的 `@vxture/design-system/*` 导入会失败；文档、package exports、tsconfig alias 与守卫脚本三者保持一致。

## 第二维度任务清单

1. P0：应用侧 DS 入口白名单。状态：已完成；守卫只允许根入口、`/tokens`、`/types`、`/server` 和明确暴露的 `styles/*`，未授权深层导入会失败。
2. P0：应用侧底层 UI 引擎隔离。状态：已完成；源码 import 和 `package.json` 依赖清单均禁止直接使用 `@phosphor-icons/react`、`lucide-react`、`react-icons`、`@radix-ui/*`。
3. P0：应用侧私有 token / 原生控件 / 原生表格 / 设计型 inline style / 硬编码尺度。状态：已完成；`design-system-baseline.json` 为空 baseline，新增违规由 `pnpm lint:design` 阻断。
4. P1：应用通用 UI 组合能力回收到 DS。状态：已完成主要高频路径；DataTable、FilterBar、ActionMenu、Pagination、DialogForm、StatusBadge、MetricCard 已公共导出并被 admin/console/agent-studio/website 高频场景消费。
5. P1：DS 消费者质量门禁一致化。状态：已完成；website/admin/console/agent-studio/varda/agent-studio/agent-template/@vxture/design-system 均有真实 lint，历史 Ruyin 已迁出，新增消费者继续按同口径巡检。
6. P1：持续巡检新增页面。状态：进行中；新增列表、表单、弹窗、菜单、分页、表格必须先复用 DS，不足时先补 DS 再落应用；portal 全局入口只做 import 聚合。
7. P2：DS README 与包说明组件清单同步。状态：持续同步；README、`docs/40-implementation/packages/design/design-system.md`、`docs/10-standards/design-system.md` 与包版本、47 个 UI 组件、5 个 AI 组件、公共导出入口一致。

## 本轮梳理（2026-05-12）

1. 已确认：应用源码未发现未授权 DS 深层导入；DS 样式入口集中在 `@vxture/design-system/styles/globals.css`，应用 `globals.css` 只做 import 聚合。
2. 已确认：应用源码和应用 `package.json` 未发现底层 UI 引擎直接导入或直接依赖。
3. 已确认：应用侧 `--vx-*` token 定义、原生基础控件、原生表格扫描无结果。
4. 已确认：设计型 inline style 由 guardrail 区分，当前只保留坐标、进度、CSS 变量、背景图、动画延迟等动态值。
5. 已确认：`pnpm lint:design` 通过，`design-system-baseline.json` 为空 baseline。
6. 已完成：历史 Ruyin 和 `agent-studio/agent-template` 已接入真实 lint；P7b 后 Ruyin 已迁出，DS 消费者质量门禁进入新增消费者巡检。

## 第二阶段补充记录（2026-05-15）

1. 已完成：`styles/tokens.css` 从单体运行时值源拆为稳定 import-only 入口，具体值按 `tokens-theme`、`tokens-colors-*`、`tokens-foundation`、`tokens-component-*`、`tokens-platform-*`、`tokens-admin-*`、`tokens-console-*`、`tokens-agent-studio`、`tokens-website`、`tokens-dark`、`tokens-density` 分层维护。
2. 已完成：所有 `tokens-*` 运行时 token 模块低于 8KB，`tokens.css` 只保留公共入口职责，继续通过 `@vxture/design-system/styles/tokens.css` 对外暴露。
3. 已完成：`pnpm lint:design` 增加 `ds/no-large-token-style-leaf`，防止新的 token 模块重新膨胀；`tokens-*` 被识别为 DS token owner，允许维护运行时 token 值。
4. 已完成：`platform-*-tokens.css` 作用域变量组装文件已改名为 `*-bindings.css`；新增 `ds/no-misnamed-token-style-module`，禁止非 runtime token 层继续使用 `*-tokens.css` 命名。
5. 分层边界：DS 只沉淀 token、基础组件语义类、跨应用 pattern 和 portal style pack；应用侧只组合业务场景，不定义 `--vx-*`、不直接消费底层 UI 引擎、不直接引用 DS 内部 `tokens-*` 文件。
6. 已完成：Quantum AI 色板已按完整方案从临时 patch 迁入 DS token 分层；`tokens-colors-primitives.css` 替换 brand ramp 并新增 AI / AI-CYAN / SPARK primitive，`tokens-colors-semantic.css` 更新 primary、border、ring、auth、shell 与 AI semantic，`tokens-gradients.css` 承接 aurora / brand / AI duo / spark pulse，`tokens-theme-*` 同步 Tailwind bridge，暗色主题、README、包说明和使用规范同步更新；新增 `ds/no-app-ai-primitive-token`，禁止应用侧直接消费 AI primitive 色阶。原始 patch 已归档到 `docs/30-design/tokens-quantum-ai.md`。
7. 已完成：DS 内部补齐 AI 语义调用面，`@vxture/design-system/tokens` 暴露 `colors.semantic.ai*` 与 `gradients.*` 引用，Tailwind bridge 暴露 `bg-vx-gradient-*` 映射，`components.css` 新增 `.vx-ai-surface`、`.vx-ai-chip`、`.vx-ai-dot`、`.vx-ai-gradient-text`、`.vx-ai-ambient` 通用基准类。应用端后续只做业务组装，不再自行定义 AI 表面、徽章、渐变文本和环境光基线。
8. 已完成：应用侧开始消费 AI 语义 token；Varda chat、admin assistant panel/message/composer/sidebar 和 Console assistant panel 已从通用 brand/primary 迁到 `--vx-color-ai*`、`--vx-gradient-ai-duo`、`--vx-color-spark*`，应用侧无 AI primitive 直接消费。
9. 已完成：`foundation-patch.css` 迁入 DS Foundation 层；spacing 3xl/4xl、radius xs/2xl/3xl、shadow xs-xl/2xl/glow/focus-ring、duration/easing/motion、`vx-*` keyframes、Tailwind `@theme` animate 映射和 TS token 引用已归入 `tokens-foundation.css`、`tokens-density.css`、`tokens-theme-foundation.css` 与 `src/tokens/*`。临时 patch 文件已删除，应用端后续只消费 DS token / Tailwind bridge / DS 组件封装，不再自定义固定阴影、圆角、动效曲线或关键帧。
10. 已完成：`typography-funnel-display.css` 的 Funnel Display 迁移职责已落到 DS `typography.css`、应用 `layout.tsx` 字体加载器与 `docs/10-standards/font-system.md`；临时 patch 文件已删除，不再作为字体体系事实来源。
11. 已完成：DS 基础组件、auth 控件、Console shell 与 Platform shell 第一批 effect 收敛；`components-button`、`components-shell-*`、`auth-fields-controls`、`auth-signup`、`auth-actions-social`、`console-*` shell 文件和 `platform-shell-*` 文件已改为消费 `--vx-control-transition`、`--vx-shell-*transition`、`--vx-control-focus-shadow`、`--vx-auth-*shadow` 等组件 effect token；新增 `tokens-component-effects.css` 承接动效/阴影语义，避免 `tokens-component-semantics.css` 重新超过 8KB；`ds/no-ds-locked-hardcoded-effect` 锁住已收敛文件，禁止硬编码动效和裸 focus ring 回流。
12. 已完成：Platform access / models / notifications 列表模式 effect 收敛；列表行 hover/active transition、选择器 fade、active inset shadow、抽屉 shadow 和模型操作菜单 shadow 已迁到 `--vx-platform-list-row-*`、`--vx-platform-drawer-shadow`、`--vx-platform-menu-shadow*` token；`ds/no-ds-locked-hardcoded-effect` 扩展到这些平台 pattern 文件，禁止硬编码动效和裸 shadow 回流。
13. 已完成：Auth header / captcha / visual panel、Fullscreen 与 DS AI / shell 用户偏好效果收敛；品牌入口、语言面板、验证码弹层、扫描线、状态点、全屏切换、AI surface/dot、Switch thumb、segmented active 和用户菜单阴影已统一迁到 `tokens-component-effects.css`，并扩展 effect / shadow 锁定集合，禁止已收敛模块重新写裸 transition、animation 或 `box-shadow`。
14. 已完成：DS 样式层 shadow 债务清零；auth scoped shadow、Console assistant / tenant switcher / brand filter、Platform access / account / shell bindings 的裸 `box-shadow`、多行 shadow、`drop-shadow` 和 bindings 内 `--vx-*shadow*` 直写已迁入 `tokens-component-effects.css`、`tokens-console-size-effect.css`、`tokens-platform-semantics.css`。新增 `ds/no-ds-style-hardcoded-shadow`，非 token owner 的 DS 样式和 bindings 只能通过 `var(--vx-*)` 或 `none` 消费 shadow。
15. 已完成：DS 样式层 motion/transition 债务清零；auth tabs / send-code 与 tenant settings row 的裸 `0.15s`、`0.2s`、`160ms ease` 已迁入 `--vx-auth-tab-transition`、`--vx-auth-send-code-transition`、`--vx-platform-tenant-settings-row-transition`。Platform assistant panel binding 也改为引用平台 motion token；新增 `ds/no-ds-style-hardcoded-motion`，非 token owner 的 DS 样式和 bindings 不得直写 `ms/s` 时长或 motion 曲线。
16. 已完成：DS 五类总审计闭环；非 token owner 当前无 raw color、非法 font-family、裸 shadow、裸 motion 和声明级硬编码 scale 命中。尺度类历史存量已从 963 行降到 0 行，新增 `tokens-scale-px.css`、`tokens-scale-rem.css`、`tokens-scale-flow.css` 作为 DS 内部历史尺度桥接 token，非 token owner 统一改为 `var(--vx-scale-*)` 消费；`ds/no-ds-style-hardcoded-scale-budget` 同步下调为 0。`@media` 断点因 CSS 变量不能可靠用于媒体查询条件，作为断点常量由守卫排除，不计入声明级尺度债务。
17. 已完成：DS scale 第一轮语义提升；非 token owner 不再直接消费 `--vx-scale-*`，auth / platform / console / component 样式分别迁到 `--vx-auth-scale-*`、`--vx-platform-scale-*`、`--vx-console-scale-*`、`--vx-component-scale-*` 域语义桥接 token。新增 `ds/no-ds-style-scale-bridge-usage`，禁止具体样式绕过域语义层直接使用全局 scale 桥接 token；后续继续把高频域 scale 提升为具体组件语义 token。
18. 已完成：DS 组件层兼容 `exactOptionalPropertyTypes`；`AuthLogin`、`ShellChrome`、fullscreen 类型、Icon 和 Radix wrapper 已区分“可省略属性”和“显式 undefined”，DS 在根 tsconfig 严格 optional 语义下恢复 `type-check` / `build` 通过。
19. 已完成：Platform scale 第二轮语义提升；`platform-*` 具体样式不再直接消费 `--vx-platform-scale-*` 总桥接 token，已按 access / account / models / shell / layout / notifications / tenant-settings / common 八个子域迁到 `--vx-platform-<domain>-scale-*`。新增 `ds/no-ds-style-platform-scale-bridge-usage`，禁止 Platform 样式绕过子域语义层直接回到总桥接；后续可继续把高频子域尺度提升为 card、table、toolbar、dialog 等组件语义 token。
20. 已完成：Console / Auth / Component scale 第二轮语义提升；`console-*` 具体样式迁到 assistant / shell / tenant-switcher / responsive / common 子域，`auth-*` 具体样式迁到 actions / captcha / fields / form / responsive / signup / tabs / visual 子域，`fullscreen.css` 迁到 component fullscreen 子域。新增 `ds/no-ds-style-console-scale-bridge-usage`、`ds/no-ds-style-auth-scale-bridge-usage`、`ds/no-ds-style-component-scale-bridge-usage`，禁止具体样式重新直接消费各自总桥接 token；后续进入组件语义 token 融合阶段。
21. 已完成：Auth / Console / Component 组件语义 token 融合；Console viewport/shell/tenant/assistant、Component fullscreen、Auth form/fields/actions/signup/captcha/tabs/visual/responsive 已从子域 scale token 提升到语义 token。新增 `ds/no-ds-style-auth-subdomain-scale-usage`、`ds/no-ds-style-console-subdomain-scale-usage`、`ds/no-ds-style-component-subdomain-scale-usage`，锁定这三类具体样式不得再直接消费子域 scale token；Platform 子域 scale 作为下一批重点继续融合。
22. 已完成：Platform models 语义 token 融合；模型列表列宽、行高/行距、状态标签、行操作菜单、分页、授权弹窗、工具栏、分段控件和行身份信息已提升到 `--vx-model-*` / `--vx-models-*` 语义 token，`platform-models*` 具体样式不再直接消费 `--vx-platform-models-scale-*`。新增 `ds/no-ds-style-platform-models-subdomain-scale-usage`，锁定 models 子域不得回退；下一步继续处理 `platform-access*` 与 `platform-notifications*`。
23. 已完成：Platform access / notifications 语义 token 融合；成员与角色访问页的页面框架、工具栏、列表列宽、身份信息、操作菜单、权限芯片、详情抽屉、空状态，以及通知页的标题、偏好摘要、分组、表格、开关、状态和移动端布局已提升到 `--vx-access-*` 与 `--vx-notification-*` 语义 token。新增 `ds/no-ds-style-platform-access-subdomain-scale-usage`、`ds/no-ds-style-platform-notifications-subdomain-scale-usage`，锁定 access / notifications 子域不得直接回退到子域 scale token；下一步继续巡检 account / shell / layout / tenant-settings / common 的高频语义融合空间。
24. 已完成：Platform tenant-settings / shell 语义 token 融合；租户设置页的页面框架、区块、列表、摘要、状态、选择器、危险区和动作入口已提升到 `--vx-tenant-settings-*`，Shell 顶栏搜索、图标按钮、用户入口、助手面板、响应式内容 padding 已提升到 `--vx-shell-*` / `--vx-assistant-panel-*` 语义 token。新增 `ds/no-ds-style-platform-tenant-settings-subdomain-scale-usage`、`ds/no-ds-style-platform-shell-subdomain-scale-usage`，锁定 tenant-settings / shell 子域不得回退；下一步继续处理 `layout`、`common` 和 `account`。
25. 已完成：Platform layout / common 语义 token 融合；页面容器、标题区、摘要条、设置分栏、卡片/操作列表、Console shell 绑定、平台 core、brand hero、data table 与共享响应式覆盖已提升到 `--vx-layout-*` 与 `--vx-platform-*` 共享语义 token。新增 `ds/no-ds-style-platform-layout-subdomain-scale-usage`、`ds/no-ds-style-platform-common-subdomain-scale-usage`，锁定 layout / common 子域不得回退；Platform 子域 scale 直连剩余重点收敛到 `account`。
26. 已完成：Platform account 语义 token 融合；账号资料页、组织资料、头像/Logo、资料字段、外部账号绑定、资料弹窗和头像编辑器已提升到 `--vx-account-profile-*`、`--vx-profile-*`、`--vx-organization-*`、`--vx-account-connected-*` 语义 token。新增 `ds/no-ds-style-platform-account-subdomain-scale-usage`，锁定 account 子域不得回退；至此 Platform 具体样式层不再直接消费各子域 scale token。
27. 已完成：Platform 语义 token 收尾质量巡检；新增语义 token 无重复声明、无未消费声明、无自引用变量，所有 `tokens-platform-*-semantics.css` 文件均低于 8KB。`--vx-account-profile-title-size` 已从 common 边界移回 account profile 语义文件，保持 token ownership 与业务域一致。
28. 已完成：DS 结构融合第一批；在不突破 8KB 叶子上限、不改变公开入口的前提下，`platform-models-shell.css` 回收模型页 shell layout / controls 两个机械拆分文件，`tokens-component-scale.css` 与 `tokens-console-scale.css` 回收各自小型 scale 子文件。DS 样式文件数从 191 降到 181，`pnpm lint:design` 与 `pnpm --filter @vxture/design-system build` 通过。
29. 已完成：DS 文档漂移守卫；README、包说明和使用规范已同步到 47 个 UI 组件、5 个 AI 组件、包版本 `1.3.0` 与当前 `package.json` exports，`pnpm lint:design` 新增 `ds/no-stale-component-doc-count`、`ds/no-stale-version-docs` 和 `ds/no-stale-public-entry-docs`，组件数量、文档首部版本与公共入口后续会随实际源码和包导出自动校验；公共入口文档已支持双向校验，缺失或多写未导出的入口都会失败。新增 `ds/no-stale-package-style-exports`，防止 package exports 暴露不存在的样式入口。
30. 已完成：DS 守卫 worktree 兼容；大样式叶子阈值改为基于规范化换行后的文本长度，避免同一文件在 CRLF/LF 不同 worktree 中触发误报。
31. 已完成：DS 守卫脚本结构收敛；`package.json` manifest 统一读取一次，DS README / 包说明 / 使用规范路径集中为命名常量，组件数量、版本、公共入口和样式 exports 校验共享同一份事实来源，降低后续新增 DS 文档规则时的维护成本。
32. 已完成：DS 剩余债务只读统计；当前 DS 样式文件 331 个，无 7KB/8KB 以上叶子，import-only 样式文件 68 个，其中单 import wrapper 仅剩 `tokens-auth-scale.css`；`--vx-component-metric-*` 命中 1116 处，`--vx-scale-*` / 域 scale bridge 命中 1089 处，下一轮候选为折叠 `tokens-auth-scale.css` 与继续推进 token bridge 语义提升。应用侧抽样巡检结果：未授权 DS 深层导入 0、应用 `--vx-*` 定义 0、底层 UI 引擎直接引用 0，剩余 13 处 inline style / 原生标记扫描命中主要是动态坐标、进度、CSS 变量或运行时宽度。
33. 已完成：DS 统计口径固定；后续每轮收敛统一记录 style file count、7KB/8KB 叶子数量、import-only 文件数、单 import wrapper 数、`--vx-component-metric-*` 命中、scale bridge 命中、未授权 DS 深层导入、应用 `--vx-*` 定义、底层 UI 引擎直接引用和动态 inline/native 扫描命中。统计只作为候选排序依据，是否修改仍以 `pnpm lint:design`、包级 lint/type/build 和视觉风险为准。
34. 已完成：DS 单 import wrapper 清零；`tokens.css` 已直接聚合 `tokens-auth-scale-core.css`，删除只转发一个子模块的 `tokens-auth-scale.css`，DS 样式文件数从 331 降到 330，单 import wrapper 从 1 降到 0。新增 `ds/no-redundant-ds-style-wrapper`，禁止 DS 内部普通样式 wrapper 重新只转发一个子模块，`package.json` 暴露的公开 `styles/*` 稳定入口除外。
35. 已完成：Auth scale bridge 语义提升试点；`tokens-auth-controls-semantics.css` 新增控件域基础语义 token，`tokens-auth-experience-semantics.css` 新增体验域基础语义 token，复用认证控件/体验的边框、间距和动作尺寸语义。`tokens-auth-controls-semantics.css` 的 auth scale 直连从 43 降到 29，`tokens-auth-experience-semantics.css` 的 auth scale 直连从 53 降到 36，DS 全局 scale bridge 命中从 1089 降到 1058；视觉值保持不变，后续可按同一模式继续处理 auth visual / responsive 细分 token。
36. 已完成：Auth signup 与重复尺度小批次收敛；`tokens-auth-signup-semantics.css` 新增注册页边框、间距和控件高度语义 token，复用 main/card/header/field/footer 等重复尺度；`tokens-auth-controls-semantics.css`、`tokens-auth-experience-semantics.css` 继续回收重复的控件间距、视觉尺寸和响应式高度语义。当前 auth scale 直连统计：controls 从 30 降到 27，experience 从 39 降到 36，signup 从 26 降到 20；DS 全局 scale bridge 命中从 1058 降到 1046，公共入口和视觉值保持不变。
37. 已完成：Platform shell / notifications 重复尺度小批次收敛；`tokens-platform-shell-semantics.css` 新增 shell 边框、间距、尺寸和圆角语义 token，`tokens-platform-notifications-semantics.css` 新增通知页边框、间距、控件尺寸和表格列宽语义 token。当前 platform scale 直连统计：shell 从 52 降到 22，notifications 从 57 降到 35；按当前脚本扫描口径，DS 全局 scale bridge 命中降到 907，公共入口和视觉值保持不变。
38. 已完成：Platform tenant-settings / common 重复尺度小批次收敛；`tokens-platform-tenant-settings-semantics.css` 新增租户设置页边框、间距、尺寸和控件高度语义 token，`tokens-platform-common-semantics.css` 新增平台共享边框、间距、动作尺寸和小号文本语义 token。当前 platform scale 直连统计：tenant-settings 从 54 降到 36，common 从 53 降到 39；按当前脚本扫描口径，DS 全局 scale bridge 命中从 907 降到 875，公共入口和视觉值保持不变。
39. 已完成：Platform models / layout / access 大批次语义收敛；`tokens-platform-models-layout-semantics.css`、`tokens-platform-layout-semantics.css`、`tokens-platform-layout-shell-semantics.css`、`tokens-platform-access-semantics.css` 新增各自边框、间距、尺寸、列宽和圆角语义 token，集中替换列表列宽、shell 控件、分页、菜单、区块边框等重复尺度。当前 platform scale 直连统计：models-layout 从 61 降到 44，layout 从 51 降到 40，layout-shell 从 42 降到 25，access 从 40 降到 28；DS 全局 scale bridge 命中从 875 降到 818，公共入口和视觉值保持不变。
40. 已完成：Platform account / profile 大批次语义收敛；`tokens-platform-account-profile-card-semantics.css`、`tokens-platform-account-connected-semantics.css`、`tokens-platform-profile-page-semantics.css` 新增账号资料、外部账号和资料页边框、间距、尺寸、文本语义 token，集中替换卡片边框、头像尺寸、弹窗间距和资料行文本尺度。当前 platform scale 直连统计：account-profile-card 从 37 降到 27，account-connected 从 35 降到 25，profile-page 从 27 降到 21；DS 全局 scale bridge 命中从 818 降到 792，公共入口和视觉值保持不变。
41. 已完成：DS scale bridge 全量清零；一次性解析 `tokens-*` runtime token 文件中的 `var(--vx-scale-*)`、`var(--vx-platform-scale-*)`、`var(--vx-auth-scale-*)`、`var(--vx-console-scale-*)`、`var(--vx-component-scale-*)`，将 792 处 bridge var 用法落为 token owner 内的实际运行时值。新增 `ds/no-runtime-scale-bridge-var-usage` 守卫，禁止 DS 样式层重新通过 `var()` 消费 scale bridge token；当前 DS 全局 scale bridge 命中为 0。
42. 已完成：Component metric 债务只读排序；当前 `var(--vx-component-metric-*)` 命中 1017 处，最高集中在 `tokens-website.css` 57、`tokens-admin-base-size.css` 54、`tokens-admin-service-health.css` 51、`tokens-admin-directory.css` 49、`tokens-console-space.css` 44、`tokens-component-control-semantics.css` 42、`tokens-admin-base-space.css` 41、`tokens-admin-governance.css` 39、`tokens-admin-captcha.css` 37、`tokens-admin-shell-header.css` 35、`tokens-admin-platform-autonomy.css` 35。下一批采用 token owner 内直接落运行时值的方式一次性清理 metric bridge var，并追加回流守卫。
43. 已完成：Component metric bridge 全量清零；一次性解析 46 个 `tokens-*` runtime token 文件中的 1017 处 `var(--vx-component-metric-*)`，将其落为 token owner 内的实际运行时值。当前 `var(--vx-component-metric-*)` 命中为 0；本批只改变 token runtime 值源表达方式，不改变公共入口和消费者选择器。
44. 已完成：Component metric 回流守卫；新增 `ds/no-runtime-component-metric-var-usage`，禁止 DS 样式层重新通过 `var()` 消费 `--vx-component-metric-*` 兜底 token。至此 scale bridge 与 component metric bridge 两类运行时 var 债务均进入 0 baseline 回流拦截。
45. 已完成：Component metric 批次验收；`pnpm lint:design`、`node --check scripts/guardrails/check-design-system.mjs`、`pnpm --filter @vxture/design-system lint`、`pnpm --filter @vxture/design-system type-check`、`pnpm --filter @vxture/shared build`、`pnpm --filter @vxture/design-system build`、`git diff --check` 均通过；当前 scale bridge 与 component metric bridge 命中均为 0。
46. 已完成：Raw color / effect 口径复核；非 token owner raw color 命中为 0，raw color 仅保留在 `tokens-colors-*`、`tokens-dark-*`、shadow/effect 等 runtime token owner 内。粗略 effect 扫描中的 `transition`、`box-shadow` 命中主要来自已 token 化的多行声明或 token owner 定义，现有 `ds/no-ds-style-hardcoded-shadow`、`ds/no-ds-style-hardcoded-motion` 与已锁定 effect 规则继续负责回流拦截；本批不做样式实现改动。
47. 已完成：Component metric 定义文件退场；删除已无消费者的 `tokens-component-metrics.css`、`tokens-component-metrics-em.css`、`tokens-component-metrics-px.css`、`tokens-component-metrics-rem.css`、`tokens-component-metrics-rem-controls.css`、`tokens-component-metrics-rem-fine.css`、`tokens-component-metrics-rem-layout.css`、`tokens-component-metrics-rem-ui.css`，并从 `tokens.css` 移除聚合入口。新增 `ds/no-legacy-component-metric-token-style`，禁止这些兜底 metric token 文件或 import 恢复。
48. 已完成：Scale bridge 定义文件退场；删除已无消费者的 `tokens-scale-flow.css`、`tokens-scale-rem.css`、`tokens-scale-px.css`、`tokens-platform-scale.css`、`tokens-platform-scale-core.css`、`tokens-platform-scale-layout.css`、`tokens-auth-scale-core.css`，并从 `tokens.css` 移除聚合入口。扩展 `ds/no-legacy-scale-token-style`，禁止这些已清零 bridge token 文件或 import 恢复；DS 样式文件数从 322 降到 315。
49. 已完成：Scale bridge 守卫文案同步；`ds/no-ds-style-*-scale-bridge-usage` 仍保留回流拦截职责，但提示不再引导迁移到已删除的桥接 token，统一改为落到具体语义 token。当前 `var(--vx-scale-*)`、`var(--vx-platform-scale-*)`、`var(--vx-auth-scale-*)`、`var(--vx-console-scale-*)`、`var(--vx-component-scale-*)` 运行时消费维持 0。
50. 已完成：DS 当前状态快照；当时 DS 样式文件 315 个，7KB/8KB 以上叶子 0，单 import wrapper 0，`var(--vx-component-metric-*)` 0，`var(--vx-*-scale-*)` 0，`--vx-component-metric-*` 定义 0，`--vx-scale-*` / `--vx-platform-scale-*` / `--vx-auth-scale-*` 定义 0。跨应用巡检未发现业务源码 DS 深层导入、应用侧 `--vx-*` 定义或底层 UI primitive 直连；剩余扫描命中来自 `packages/design/foundation-v1.3.0-complete.css` 和 `packages/design/vxture-v1.3.0-components/*` 历史素材包，已在第 52 批清理。
51. 已完成：DS 不可达样式 wrapper 退场；删除 12 个无法从 package exports 公共入口到达的 import-only 聚合层：`platform-access-shared-panels.css`、`platform-account-connected.css`、`platform-account-profile-base.css`、`platform-account-profile-card.css`、`platform-layout-admin-models-bindings.css`、`platform-layout-shell-bindings.css`、`platform-notifications-table.css`、`platform-shell-bindings.css`、`tokens-admin-operations.css`、`tokens-component-effects.css`、`tokens-foundation.css`、`tokens-platform-access-layout-semantics.css`。新增 `ds/no-unreachable-ds-style-module`，要求 DS `src/styles` 文件必须能从 `package.json` 暴露的公共样式入口到达；DS 样式文件数从 315 降到 303。
52. 已完成：DS 迁移素材包退场；删除 `packages/design/foundation-v1.3.0-complete.css` 与 `packages/design/vxture-v1.3.0-components/` 历史输入包，并从守卫忽略清单移除对应例外。迁入完成后的事实来源只保留 `packages/design/design-system/src/styles/*`、`src/tokens/*`、DS 文档和规范。
53. 已完成：应用侧动态 style 收口守卫；`ds/no-inline-design-style` 扩展到 `const *Style = { ... }` 与返回 `CSSProperties` 的 `*Style()` helper，防止固定颜色、字体、间距、圆角、阴影等设计值通过间接 style 对象绕过 inline 检查。当前保留的 `style=` 命中均为主题启动脚本、坐标、transform、进度、背景图片、CSS 变量或调试面板位置这类运行时动态值。
54. 已完成：DS 迁移素材回流守卫；新增 `ds/no-design-migration-artifacts`，禁止 `packages/design/*.css` 迁移输入文件和 `packages/design/vxture-v*-components/` 素材包重新长期保留。正常新增 design package 不受该规则影响，但迁入完成的素材必须只落到 `design-system/src/styles`、`src/tokens` 和正式组件源码。
55. 已完成：Token leaf 温和归并；将 `tokens-admin-base-track-effect.css` 下 6 个单父 token leaf、`tokens-console-size-effect.css` 下 4 个单父 token leaf、`tokens-platform-semantics.css` 下 6 个 access 语义 token leaf 内联到父文件，删除 16 个无独立入口的碎片文件。变量名、运行时值和公共入口保持不变；DS 样式文件数从 303 降到 287。
56. 已完成：同域样式 leaf 温和归并；将 Console shell surface 3 个 leaf、Console tenant switcher panel 3 个 leaf、Platform access identity 2 个 leaf、Component shell semantic 6 个 leaf 内联到各自父文件，删除 14 个无独立入口的碎片文件。选择器、变量名、运行时值和公共入口保持不变；`platform-notifications.css` 因稳定 style pack 入口规则保持 import-only；DS 样式文件数从 287 降到 273。
57. 已完成：Token 聚合批次压缩到 250 以下；将 Admin assistant workspace 5 个 leaf、Admin base space/size 3 个 leaf、Admin directory/governance 2 个 leaf、Admin feature aliases 3 个 leaf、Admin management aliases 4 个 leaf、Admin shell 4 个 leaf、Colors semantic 7 个 leaf 内联到各自父 token 文件，删除 28 个单父引用碎片文件。变量名、运行时值和公共入口保持不变，合并后 token 父文件均低于 8KB 守卫阈值；DS 样式文件数从 273 降到 245。
58. 已完成：低风险 token/auth leaf 继续归并；将 Dark token 5 个 leaf、Platform account profile semantic token 4 个 leaf、Platform core semantic token 3 个 leaf、Component semantic token 2 个 leaf、Auth visual panel 4 个 leaf、Auth actions 4 个 leaf、Auth fields 3 个 leaf 内联到各自父文件，删除 25 个单父引用碎片文件。选择器、变量名、运行时值和公共入口保持不变，合并后最大样式文件约 6.7KB；DS 样式文件数从 245 降到 220。
59. 已完成：统一收敛剩余 8KB 内单父 leaf；将 Platform account profile fields 5 个 leaf、Platform core 5 个 leaf、Platform access shell 4 个 leaf、Platform shell assistant 4 个 leaf、Components shell user menu 4 个 leaf、Toast/drawer/skeleton 3 个 leaf、Console assistant 3 个 leaf、Console shell layout frame 3 个 leaf、Platform notifications shell 3 个 leaf、Platform models shell 3 个 leaf、Typography 3 个 leaf、Platform access identity 2 个 leaf 内联到各自父文件，删除 42 个碎片文件。公共 style pack 入口保持 import-only，合并后最大样式文件约 7.4KB；DS 样式文件数从 220 降到 178。
60. 已完成：尾部小 leaf 部分归并；在保留大模块 import 的前提下，将 Platform account connected semantic token 1 个 leaf、Theme semantic/gradient/foundation 3 个 leaf、Components AI generation/prompt/bubble token 3 个 leaf、Auth signup/experience semantic 2 个 leaf 内联到各自父文件，删除 9 个单父引用碎片文件。公共入口和剩余大模块边界保持不变，合并后最大样式文件约 8KB 内；DS 样式文件数从 178 降到 169。
61. 已完成：最后 3 个局部 leaf 收口；将 Console effect token、Console tenant switcher panel list、Console shell chrome surface header 按原 import 所在位置内联到父文件，删除 3 个单父引用碎片文件。级联顺序、选择器、变量名和公共入口保持不变，合并后最大相关文件约 5.6KB；DS 样式文件数从 169 降到 166，本轮 DS 压缩工作暂时结束。

## 后续验收清单

- `pnpm lint:design` 扫描所有前端工作区并通过。
- `rg -n "tranvx" portals/website/src` 无结果。
- `rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(" business agent-studio portals --glob "!**/public/**"` 仅在 DS token owner 或允许位置出现。
- `rg -n -- "--vx-[\w-]+\s*:" portals business agent-studio --glob "*.css"` 的新增命中会被 `pnpm lint:design` 阻断。
- `rg -n -- "--vx-color-ai-[0-9]|--vx-color-ai-cyan-[0-9]|--vx-color-spark-[0-9]|\\b(?:bg|text|border|ring|from|via|to)-vx-(?:ai|ai-cyan|spark)-[0-9]" portals business agent-studio` 无应用消费结果；新增命中会被 `ds/no-app-ai-primitive-token` 阻断。
- `rg -n "@/components/ui|components/primitives" portals business agent-studio` 无业务源码结果。
- `rg -n "@vxture/design-system/" portals business agent-studio packages --glob "*.ts" --glob "*.tsx" --glob "*.css"` 的结果仅允许 `/tokens`、`/types`、`/server` 和 package exports 暴露的 `styles/*`；无 `src/**` 或其他未授权深层导入。
- `rg -n "@phosphor-icons/react|lucide-react|react-icons|@radix-ui/" portals business agent-studio --glob "package.json"` 无应用依赖清单结果。
- CSS 图谱无断链相对 `@import`，应用 `src/styles/*.css` 无不可达模块；新增断链或陈旧样式文件会被 `pnpm lint:design` 阻断。
- 非 `globals.css` 直连的应用 `src/styles` import-only wrapper 不得只转发一个子模块；单子中间层必须折叠或补充真实语义聚合职责。
- `packages/design/design-system/README.md`、`docs/40-implementation/packages/design/design-system.md`、`docs/10-standards/design-system.md`、`packages/design/design-system/package.json` 的版本、组件数量、导出入口一致。
- `agent-studio/varda` 提供真实 lint 脚本，并通过 `pnpm --filter @vxture/agent-studio-varda lint`。
- 历史 Ruyin、`agent-studio/agent-template` 与其他 DS 消费者均通过各自适用的 `type-check`、`lint`、`build`；P7b 后 Ruyin 已迁出。
- 每批迁移后，变更范围对应的 DS/portal/domain package 必须独立验证并独立 commit。
