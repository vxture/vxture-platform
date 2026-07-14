# Admin 应用补齐与修正 — 实施计划（post-18-schema cutover）

> 状态：✅ 已完成（2026-07-05，见 §5 计划收尾）· v1 · 2026-07-04 · 依据 = 11-agent 审计（admin portal + admin-bff 全量对照新 18-schema）
> 目标：admin 侧业务应用**全部对接真实数据 + 补齐功能 + UI 遵循 DS**（@vxture/design-system）
> 权威表清单 = deploy/database/ddl/（106 表）。运行时 = raw-pg（硬编码 schema.table），model-platform 例外用自带 Prisma。

## 0. 审计关键结论

1. **整个 commerce 后端不存在**：19 个 commerce 客户端方法（billing/invoices/orders/payments/subscriptions/commercial，覆盖 12 页）在 admin-bff **无任何 @Controller** → 前端 readJson 静默回退空数组、mutation POST 404。最大工作量主体。
2. **两个基础治理端点无 controller**：`/api/tenants`（租户三页+运营待办）、`/api/accounts`（账号目录）完全 orphaned。OpsTodos strict-fetch 直接崩，其余静默全空。
3. **两个死表 router 恒 502**（to_regclass 自守卫）：`tickets`（support.ticket/tenant.tenant/tenant.tenant_setting 死表）、`platform-governance`（admin.governance_record 死表，无 106 表对应）。
4. **两个 stub router 硬编码 return []**：`audit-logs`（support.audit_logs 已存在）、`announcements`（admin.announcements 已存在）——真实表就位，仅需接线。
5. **唯二健康且有真实写路径**：identity/access（admin.operator\_\* 全系列健康）、model-platform（独立 Prisma 微服务代理，完整 CRUD）。其余动作几乎全是 disabled stub 或指向不存在端点。
6. **DS 债系统性而非零散**：无裸 table/button/inline style，但普遍用 div-grid（`vx-*-directory-list`）替代 DS DataTable；commerce 另有自造 CSS + raw `<Link vx-btn>` 当按钮 + SummaryItem/Badge 替代 MetricGrid/StatusBadge。

## 1. 开放问题的默认决策（可逆、最小足迹、无投机建表）

自动执行，按「起步最小化 + 无技术债 + 先夯基础不走捷径」原则取默认；均可逆，事后可由 owner 改判。

| #   | 问题                                                                                         | 决策（默认）                                                                                                                                                    | 理由 / 可逆性                                                                                    |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Q1  | platform-governance（密钥/任务/审批）SoT：admin.governance_record 无后继，三类真实后备表均缺 | **不投机建 schema**。router 改为按 :kind 优雅返回空（不再 502）；密钥/任务/审批三页保持「可访问但空态」，标注待产品定义                                         | 建表是重决策，缺明确 SoT 时不建。改 502→空态零风险；后续要落库再按 kind 映射/建表                |
| Q2  | orders SoT：106 表无独立 order 表                                                            | **合成**：以 metering.subscriptions.order_no + billing.payments(pay_order_no) + billing.invoices 合成订单视图，**不建一等 order 表**                            | 避免投机建表；读路径可用；若日后需一等实体再升级，读契约不变                                     |
| Q3  | tickets.risk_level 来源（退役 tenant.tenant_setting）                                        | **默认 'normal'**，删死 join                                                                                                                                    | 最小改动让工单通；admin.risk_records 关联留 P1 增强                                              |
| Q4  | products/skills/solutions 落库范围（当前硬编码 seed）                                        | **wire-what-exists**：DB-backed 的（plans/applications）接真实；纯 seed 的（capabilities/solutions/agents/model-policies/skills）**保持 seed**，不投机迁库/建表 | seed 迁库是产品建模决策；无对应表不投机建。ModelPlatformPage 缺的管理 UI（后端 CRUD 已存在）照补 |
| Q5  | accounts/tenants 复活 vs 删（MEMORY #23）                                                    | **复活**：新库真实表 account.users / tenancy.tenants 已就位，建读路径                                                                                           | 审计+记忆均倾向复活；是核心 admin 能力                                                           |
| Q6  | ServiceHealthPage 生产遥测源                                                                 | **保持 dev-only**，标注；不投机建生产遥测聚合                                                                                                                   | 建生产遥测是基础设施决策，非本轮范围                                                             |

## 2. 批次 backlog（执行序）

**P0 — 全部对接真实数据（让每页出真数据）**

- **B1** tickets 死表 remap（安全）；platform-governance 改优雅空态（Q1）
- **B2** audit-logs + announcements stub→接 support.audit_logs / admin.announcements
- **B3** 新建 tenants.router（读）：tenancy.tenants+tenant_profiles+memberships；verifications 接 kyc.tenant_verifications
- **B4** 新建 accounts.router（读）：account.users+profiles+avatars
- **B5** 新建 billing.router + invoices.router（读）：billing.\*
- **B6** 新建 orders.router（合成，Q2）+ payments.router（读）：metering/billing
- **B7** 新建 subscriptions.router + commercial.router（读/总览）：metering/promotion/billing 聚合

**P1 — 补齐应用功能（写路径 + 动作）**

- **B8** governance/support 动作：公告 CRUD/发布、审计筛选/导出/详情、工单详情/回复(ticket_comments)/指派/关闭/批量
- **B9** identity/access 写：平台角色/权限/账号 CRUD、平台用户管理（admin.operator\_\*，step-up gated）
- **B10** 租户治理写：租户 CRUD/编辑持久化、成员管理、认证审批（kyc.tenant_verifications 写）
- **B11** billing/invoices 动作端点（线下开票同步/账单动作/开票动作）
- **B12** orders/payments 事务写（线下支付确认、核销、驳回；跨 payments/invoices/transactions/subscriptions）
- **B13** subscriptions 动作（renew/suspend/resume/cancel → subscription_histories 快照）
- **B14** products/ai 补齐（Q4：wire-what-exists；ModelPlatformPage 管理 UI）
- **B15** 平台总览真实聚合（替换 PlatformAutonomyPage 硬编码指标）

**P2 — UI 遵循 DS**

- **B16** div-grid 目录列表统一迁 DS DataTable（全 admin 一致 house 模式，收益最大）
- **B17** Dialog/Tabs/MetricGrid/StatusBadge 迁 DS；去 raw `<Link vx-btn>`/inline style/自造 CSS

**P3 — 打磨**

- **B18** 批量动作/导出、死代码清理（ProductPlansPage）、注释/文案 schema 名残留

## 3. 纪律

- **单一权威**：任何新查询只用 106 表真实名；每批过 `pnpm lint:schema-residue`（须恒 0）。
- **参考模板**：tenancy 查询镜像 `services/identity/organization/src/repository/pg-organization.repository.ts`；router 模式镜像现有健康 router（Nest controller + 注入 RO/RW pool + 能力守卫）。
- **验证**：每批 type-check（admin-bff + admin portal）；可行处对 worker-01 只读查询验证 SQL 解析。
- **部署门控**：worker-01 部署须显式「放行」；本计划只到代码 + 本地验证 + 合 develop。
- **回填**：实测结果回填本文件。

## 4. 进度回填（2026-07-04）

分支 `feat/admin-app-completion`（未 push；部署待放行）。

**已完成 + 验证 + 提交：**

- **P0 全部对接真实数据**（commit `952af244`）：B1–B7 全部落地。tickets/governance 死表修复、audit/announcements 接线、新建 tenants/accounts/billing/invoices/orders/payments/subscriptions/commercial 共 8 个 read router。前端零改动（页面本就调这些端点）。
- **P1 commerce 写路径**（commit `0765a63e`）：B11–B13。billing（开票同步/账单动作/开票动作）、orders（线下支付确认 5 表事务）、payments（核销/驳回）、subscriptions（续订/暂停/恢复/取消）。前端按钮本就接好，补后端即生效。事务结构 begin/for-update/commit/catch-rollback/finally-release，幂等前置校验，append-only 台账，SQL 侧防浮点。
- **验证手段**：admin-bff type-check 干净；`lint:schema-residue` 恒 0；**读 21 条 + 写/锁 27 条 SQL 全部对 worker-01 活库 PREPARE 通过**（列/表/join/类型解析）。

**写路径遗留（已标注，非阻塞）：** 金融高权限写建议加 `@RequireStepUp`（需前端 step-up 流程配合）；transaction_no/pay_order_no 随机+唯一约束兜底，建议改号段服务；billing 后付费结算 adjust vs recharge trade_type 语义待 owner 复核。

**追加已完成（第二批，commit 92d33f0e / a15e1d33 / 165715f3）：**

- **P1 后端**（`92d33f0e`）：B8 governance/support（公告 CRUD、工单 详情/评论/指派/改状态、审计服务端筛选）、B10 租户治理（编辑/暂停/成员/认证审批）、B15 总览聚合端点。39 条 SQL 全 PREPARE 过（含捕获 1 真 parse 期 bug：ticket status $2 类型不一致→$2::text）。
- **B15 前端**（`a15e1d33`）：PlatformAutonomyPage 硬编码指标→真实聚合（operator/tenant/pending-verify/risk/subscription/ticket count）。
- **B8/B10 前端启用**（`165715f3`）：admin-bff.ts 加 20 客户端方法（DRY mutateJson）+ 3 记录类型；公告 CRUD（DS DialogForm）、认证审批（接真 fetchTenantVerifications + approve/reject）、工单详情抽屉/回复/指派/改状态；ConsoleAppProviders 挂 ToastProvider。type-check + eslint 干净。
- **写路径遗留**：金融/凭据写建议加 step-up（需前端配合）；号段服务；公告 read model 未暴露 severity/targeting → 编辑预填 best-effort，待读模型 enrich 无损化。

**追加已完成（第三批，commit 037b87c1 / 4a4f39ac）：**

- **B10 TenantDetail 前端启用**（`037b87c1`）：信息保存→updateTenant、暂停/恢复、成员改角色/暂停/移除（DialogForm，接 fetchTenantMembers 实时）；凭据/换 owner 保持 disabled+注释。
- **B17 DS 合规**（`4a4f39ac`）：26 处 raw `<Link vx-btn>`→DS Button(asChild)（billing/invoices/orders/payments/product-detail/subscription-detail）；3 个 createPortal 手写 modal→DS Dialog（admin-roles/permissions），去手写 overlay/Esc/outside-click/close，mid-save 守卫经 onOpenChange 保留；动态 --permission-depth CSS 变量保留。type-check+eslint 干净，零残留 vx-btn Link/createPortal。

**追加已完成（第四批，commit 70ef5c63 / a124c7f6）：**

- **B18 清理**（`70ef5c63`）：删死组件 ProductPlansPage（/product-plans 已 redirect）；清 schema 名残留（auth.service.ts `ops.*`→`admin.operator_*`、PlatformUsersPage 空态 `platform.platform_admin`→用户友好文案）。
- **B14 model-platform 管理 UI**（`a124c7f6`）：厂商 CRUD（新建/编辑/启用/停用/删除）+ 计价规则（新建/编辑/启用/停用；后端无 delete）——接已就绪的 BFF 代理 CRUD，DialogForm+Toast；顺带修 portal `ModelPriceRuleRecord` 陈旧类型对齐真实响应。seed 落库按 Q4 保持 seed（capabilities/solutions/agents 无对应表，不投机迁）。

**待续（历史记录，已于下方"计划收尾"关闭）：**

- P1：B9（identity/access 写，含凭据须经 IdP——非直写库，待接入设计）。B14 的 seed 落库按 Q4 决定保持 seed（不做）。
- P2：**B16 div-grid→DS DataTable——决定跳过（owner 2026-07-04）**。实测 accounts 迁移证明：DataTable 是语义 `<table>`，无法承载 `.vx-tenant-directory-row` 的 `grid-template-columns` 行模板 → 会丢失列宽/粘性列/堆叠小字(code·email 等 `<small>` 塌成行内)/自定义表头。这些列表本就已用 DS 组件(Icon/Badge/Button/Checkbox/Pagination)、仅容器非 `<table>`；保形须逐页补恢复 CSS(工作量大、本环境无法截图 QA、价值边际 P2)。故保留现有已打磨 div-grid，精力转 B14/B18。
- P3：B18 **已完成**——批量动作/导出（`1a082153`：新增共享 `@/lib/exportCsv`；billing/invoices/orders/payments/promotions/redemptions/usage/subscriptions 加 DS BulkActionBar「已选 N 项→导出所选+清除」+ 工具栏「导出全部」；批量*变更*故意不做——金融/订阅批量改状态有风险，只做导出+清除）；死组件清理与注释残留（`70ef5c63`）。
- 杂项 follow-up：BFF `console.types.ts` 的 `ModelPriceRuleRecord` 仍陈旧（runtime 无影响，router 仅 JSON.parse-cast）；公告 read model enrich（severity/targeting）；金融/凭据写加 step-up。

## 5. 计划收尾（2026-07-05）

**B9 已完成**——`feat/b9-idp-delegation` 分支（PR #609，2026-07-04 合并 develop=`f77d2a86`）：operator（平台管理员）身份管理全链路，凭据操作全部委派 IdP（auth-bff），never 直写库。含 admin-bff↔auth-bff 内部委派端点、rank 分级门控（TD-017）、带外密码重置/初始设密、verified-contact 主防线、自助改联系方式。B9 完成后本计划 **B1–B18 全部落地，无遗留批次**，正式收尾（对应 tech-debt.md 无独立 TD 条目——B9 相关安全债已由 TD-017/018/019 单独跟踪并 Resolved）。

**明确排除在本计划外、不视为遗留**：`admin.risk_records`/`compliance_events`/`maintenance_windows` 三张表的写路径——这三张表从未被排进 B1–B18 任何批次，产品未定义字段/工作流，属**新能力**而非本计划的疏漏。已登记为 [TD-021](../../../tech-debt.md#td-021--风险合规维护窗口治理写路径未定义)，需产品先定义再排期。
