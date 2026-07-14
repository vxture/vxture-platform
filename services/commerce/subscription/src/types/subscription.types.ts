export enum BillingCycle {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUAL = "annual",
  YEARLY = "yearly",
}

/**
 * Enum form of @vxture/shared SUBSCRIPTION_STATUSES (needed by class-validator
 * IsEnum). Values MUST stay identical to the @shared value domain — the DB
 * CHECK enforces that set, so any drift here (like the retired "paused", which
 * the DDL never allowed) makes the DTO accept writes the DB rejects, or reject
 * states the DB holds. Asserted by subscription.types.spec.ts.
 */
export enum SubscriptionStatus {
  ACTIVE = "active",
  TRIALING = "trialing",
  OVERDUE = "overdue",
  SUSPENDED = "suspended",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string; // billing rollup account (org/tenant)
  workspaceId: string; // cost center that holds the subscription (ADR-11)
  planVersionId: string; // pinned immutable plan_version
  cycleType: string;
  cycleCount: number;
  startAt: Date;
  endAt: Date | null;
  trialEndAt: Date | null;
  status: string;
  subscriptionKind: string; // paid/trial/free
  activationMethod: string; // online_purchase/offline_purchase/redemption/operator_grant/trial/free
  autoRenew: boolean;
  orderNo: string | null;
  payAmount: string | null;
  currency: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface SubscriptionHistoryRecord {
  id: string;
  tenantId: string;
  subscriptionId: string;
  changeType: string;
  fromPlanVersionId: string | null;
  toPlanVersionId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  operatorType: string;
  operatorId: string | null;
  operatorRemark: string | null;
  clientIp: string | null;
  createdAt: Date;
}

export interface ListSubscriptionsParams {
  tenantId?: string;
  workspaceId?: string;
  planVersionId?: string;
  status?: string;
  cycleType?: string;
  page?: number;
  pageSize?: number;
}

export interface ListSubscriptionsResult {
  items: SubscriptionRecord[];
  total: number;
}

export interface CreateSubscriptionInput {
  tenantId: string;
  workspaceId: string;
  planVersionId: string;
  cycleType: string;
  /** default 1 (v1: multi-cycle bundles are not supported) */
  cycleCount?: number;
  startAt: Date;
  endAt?: Date;
  trialEndAt?: Date;
  autoRenew?: boolean;
  orderNo?: string;
  payAmount?: number;
  currency?: string;
  createdBy: string;
  /** default 'active' (product_320: offline orders create 'suspended') */
  status?: string;
  /** default 'paid' */
  subscriptionKind?: string;
  /** default 'online_purchase' */
  activationMethod?: string;
  /** default 'customer' */
  createdByType?: string;
}

export interface UpdateSubscriptionInput {
  status?: string;
  endAt?: Date;
  autoRenew?: boolean;
  toPlanVersionId?: string;
  operatorType?: string;
  operatorId?: string;
  operatorRemark?: string;
  clientIp?: string;
  updatedBy?: string;
  /**
   * Compare-and-set guard (D10 sweep): when set, the write only applies if
   * the row's CURRENT status still matches — otherwise 0 rows update (no
   * history, no hooks). Closes the check-then-act window between a sweep's
   * findLapsedTrialIds/getById read and its write, where a concurrent admin
   * action (renew/resume, which locks FOR UPDATE) could otherwise be
   * clobbered back to the sweep's stale target status.
   */
  expectedStatus?: string;
}

// ── Offline order primitives (product_320 §2) ──────────────────────────────
// A pending order IS a subscription row (status='suspended', activation_method=
// 'offline_purchase') paired 1:1 with an unpaid billing.invoices row. No 7th
// subscription status, no separate order table — see product_320 §2 O1.

export type OrderIntent = "new" | "renew" | "upgrade";

export interface CreateOfflineOrderInput {
  tenantId: string;
  workspaceId: string;
  planVersionId: string;
  /** 'month' | 'year' — must have a matching product.plan_prices row */
  cycleUnit: string;
  price: number;
  currency?: string;
  createdBy: string;
  intent: OrderIntent;
  /** required when intent='upgrade': the live subscription being upgraded */
  upgradeOfSubscriptionId?: string;
  /** billing.invoice_items.item_name, e.g. "Arda Pro" */
  itemName: string;
}

export interface OfflineOrderRecord {
  subscription: SubscriptionRecord;
  invoiceId: string;
  billNo: string;
  orderNo: string;
}

export interface ActivateOrderInput {
  operatorId: string;
  remark?: string;
  clientIp?: string;
}

export interface CancelOfflineOrderInput {
  actorType: "customer" | "operator";
  actorId: string;
  remark?: string;
  clientIp?: string;
}
