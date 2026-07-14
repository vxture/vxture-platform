/**
 * list-truncation.ts - admin-bff 只读列表读取上限的前端推断辅助。
 *
 * TD-032 临时缓解：11 个 admin-bff 只读列表端点（billing/payments/subscriptions/
 * orders/invoices/accounts/tenants/usage-metering/promotions/redemptions）在
 * SQL 中硬编码 `limit 500`，暂无服务端分页契约（limit/offset+total 或 keyset
 * cursor）。命中上限时后端仍返回裸数组，不带任何截断信号，运营侧可能误以为
 * "共 500 条" 就是全量数据。真正的分页契约见 tech-debt.md TD-032，是独立的
 * 更大迁移项目；这里仅做零后端改动的前端兜底：命中上限即视为"可能被截断"，
 * 用于渲染提示条，引导运营侧收窄筛选条件。
 *
 * @package admin portal
 * @layer Presentation
 * @category lib
 */

export const ADMIN_BFF_LIST_FETCH_CAP = 500;

export function isListTruncated<T>(records: readonly T[]): boolean {
  return records.length === ADMIN_BFF_LIST_FETCH_CAP;
}
