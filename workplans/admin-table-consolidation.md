# admin 列表收敛到 DS DataTable —— 分析与排期

**上游**：`admin-ds-adoption-plan.md`（admin 接入 DS 的总规划）。那份的批 1/2 收的是
**重复组件**（指标卡、详情字段、分区标题、分页），本文收的是**列表本体**。

---

## 一、盘点

**29 个手搓列表页，约 3279 行行渲染代码。** 它们用到的能力，对照 DS `DataTable`：

| 能力       | 用量  | DataTable                               |
| ---------- | ----- | --------------------------------------- |
| 表头       | 29/29 | `columns[].header` ✅                   |
| 行操作菜单 | 26/29 | `rowActions` ✅                         |
| 序号列     | 25/29 | `indexStart` ✅                         |
| 整行点击   | 20/29 | `onRowClick` ✅                         |
| 选择框     | 19/29 | `selectedKeys` + `onSelectionChange` ✅ |
| **行语气** | 15/29 | **本轮新增 `rowTone`**（`9dda0129`）    |
| 卡片视图   | 6/29  | 与 list 是两段独立渲染，互不阻塞        |

## 二、结论：参数多不是障碍

`DataTable` 有 20 个 props，**必填只有 3 个**（`columns` / `rows` / `rowKey`）。唯一在用它的
`ServiceHealthPage` 实际只传了 4 个：

```tsx
<DataTable
  className="…"
  columns={columns}
  rows={services}
  rowKey={(s) => s.id}
/>
```

其余是**可选能力目录**，用不到就不写。因此**不拆分组件**——拆开会把"这张表长什么样"
变成必须逐件去推，`MetricListCard` 当初没做成 `ListCard` 可选槽正是同一判断。

## 三、唯一的真缺口已补上

15/29 的页面给行挂业务语气（`vx-billing-row--${status}` 一族），DataTable 原先没有对外的口子
——而且它的文件头记着当初**刻意删掉过** `getRowClassName`。

本轮补的是那条判断的正面表达：

|              | `getRowClassName`（已拒） | `rowTone`（`9dda0129`） |
| ------------ | ------------------------- | ----------------------- |
| 调用方给什么 | 任意类名                  | 语气档（六选一）        |
| 谁决定长相   | 调用方                    | **DS**                  |
| 能画出几种行 | 无限                      | 六种，全站一致          |

渲染为行首 2px 色缘，**不铺整行**（一屏几十行会读成色块；且 DataTable 已在每个单元格画了
半透明底，再叠一层就是它自己文件头记的两层半透明合成）。行内状态标与行缘共读同一张
业务状态→语气映射表（`modules/shared/status-tone.ts`），天然同源。

---

## 四、排期

前置已完成。以下按**结构相似度**分批，同批内一份 `columns` 写法可直接复用到下一页。

### 批 T1 · 商业域（6 页 / 约 1090 行）

`BillingPage` · `PaymentsPage` · `InvoicesPage` · `OrdersPage` · `SubscriptionsPage` ·
`UsageMeteringPage`

全部有 tone + 选择框，金额/状态/时间三段式列结构最一致，**先做这批建立范式**。
状态→语气映射已在 `status-tone.ts` 就位（`BILL_STATUS_TONE` / `ORDER_STATUS_TONE` /
`INVOICE_STATUS_TONE` / `RECONCILIATION_TONE` / `SUBSCRIPTION_OPERATION_TONE` /
`USAGE_RISK_TONE`），本批不需要新建映射。

### 批 T2 · 身份与租户（5 页 / 约 894 行）

`TenantsPage` · `VerificationsPage` · `AccountsPage` · `PlatformUsersPage` · `AdminRolesPage`

租户风险档映射在 `tenants/tenant-utils.ts`（`TENANT_RISK_TONE` 等）已有；账号/角色/平台用户
三页无 tone，只迁结构。

### 批 T3 · 产品与营销（4 页 / 约 615 行）

`ProductsPage` · `ProductSolutionsPage` · `PromotionsPage` · `PromotionRedemptionsPage`

产品发布态用 `CAPABILITY_STATUS_TONE`；促销两页无 tone。

### 批 T4 · 运营与治理（5 页 / 约 500 行）

`TicketsPage` · `AnnouncementsPage` · `AuditLogsPage` · `SkillsPage` · `OpsTodosPage`

工单分级尚无共享值域，映射先落 admin 侧（同 `status-tone.ts` 的边界判据）。

### 批 T5 · 轻量页（9 页 / 约 180 行）

`ModelPlatformPage` · `ModelGrantsPage` · `PlatformGovernanceListPage` · `RiskRecordsPage` ·
`MaintenanceWindowsPage` · `ComplianceEventsPage` · `SystemParametersPage` ·
`NotificationLogsPage` · `FeatureTogglesPage`

这批本身很薄（多数 ≤45 行），放最后是因为它们收益最小、且部分结构与主流不同，
适合在范式稳定之后一次扫掉。

---

## 五、每批验收

- `pnpm --filter @vxture/admin type-check` / `lint` / `build` 绿
- `pnpm lint:design` 不退化（基线 33）
- **登录态实测**：该批每页的行渲染、选择、行操作、行语气色缘逐项对照迁移前
- 行数复测：迁移后该批行渲染代码应显著低于迁移前（预计整体 3279 → 约 2300）

## 六、不在本工作线内

- **卡片视图（6 页）**：list 与 cards 是两段独立渲染，本线只动 list；cards 归
  `admin-ds-adoption-plan.md` 的批 5（卡表同源）。
- **pill 色调族（244 选择器）**：归那份的批 4。行内状态标换 `Badge` 与本线的行语气
  同源但不同批，避免一次改动跨两个语义面。
- **页面骨架 `ListPageTemplate`**：归那份的批 3。本线只换表格本体，不动页面三段式。

---

## 七、已知风险

**dev server 在连续 CSS/组件热更新后会崩**（2026-08-05 遇到两次，表现为整页
`Internal Server Error`，而 dev-panel 显示服务 healthy、`curl` 返回正常 307）。
回退改动无效，重启 admin dev 即恢复。迁移期间会频繁触发，遇到直接重启，不要按代码问题排查。
