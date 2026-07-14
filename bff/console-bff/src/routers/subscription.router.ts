/**
 * subscription.router.ts - 租户订阅管理路由
 * @package @vxture/bff-console
 * @layer Application
 * @category Router
 *
 * @author AI-Generated
 * @date 2026-05-02
 */

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { Pool } from "pg";
import { MailService } from "@vxture/core-mail";
import { SubscriptionService } from "@vxture/service-subscription";
import type { SubscriptionRecord } from "@vxture/service-subscription";
import { SUBSCRIPTION_STATUSES, TIERS, type Tier } from "@vxture/shared";
import type { RequestContext } from "../types/console.types";

// Inline the DI token (repo-wide pattern): SubscriptionModule provides the pool.
const COMMERCE_PG_POOL = "COMMERCE_PG_POOL";

// ============================================================================
// 订阅操作类型
// ============================================================================

type SubscriptionAction = "upgrade" | "pause" | "resume" | "cancel";

// ============================================================================
// /subscribe deep-link landing context (product_200 §3.2 / arda_303 §2.2)
// ============================================================================

/**
 * Intent vocabulary v1. `seat` is reserved (arda_303 §2.3) and products may
 * already emit it — it degrades as unknown BY DESIGN until implemented, so it
 * is deliberately NOT in this set. `subscribe` (product_320): the website
 * product card's deep link for a never-subscribed visitor → lands on the
 * plan ladder to place a first order.
 */
const KNOWN_INTENTS = ["subscribe", "upgrade", "renew", "addon"] as const;
type SubscribeIntent = (typeof KNOWN_INTENTS)[number];

// Order-creation intent (product_320 §2 O4) — distinct from the deep-link
// vocabulary above: it drives which subscription-service primitive runs.
const ORDER_INTENTS = ["new", "renew", "upgrade"] as const;
type OrderCreateIntent = (typeof ORDER_INTENTS)[number];
const CYCLE_UNITS = ["month", "year"] as const;

const PRODUCT_CODE_RE = /^[a-z][a-z0-9_-]{0,63}$/;

interface SubscribePlanPrice {
  cycleUnit: string;
  cycleCount: number;
  price: string;
  currency: string;
}

interface SubscribePlanOption {
  planId: string;
  planCode: string;
  planName: string;
  planVersionId: string;
  tier: string;
  prices: SubscribePlanPrice[];
}

interface SubscribeCurrent {
  subscriptionId: string;
  status: string;
  planCode: string;
  planVersionId: string;
  tier: string | null;
  endAt: string | null;
  trialEndAt: string | null;
  autoRenew: boolean;
}

/**
 * A pending offline order for (tenant × product) — the tenant's suspended
 * offline_purchase subscription row with an unpaid invoice (product_320 §2 O1).
 * Its presence means the client shows the awaiting-confirmation panel instead
 * of the plan ladder.
 */
export interface PendingOrderSummary {
  orderId: string;
  orderNo: string;
  billNo: string | null;
  planCode: string;
  tier: string | null;
  cycleUnit: string;
  amount: string;
  currency: string;
  createdAt: string;
}

export interface SubscribeContext {
  /** Normalized known intent, or null = unknown/absent → client degrades. */
  intent: SubscribeIntent | null;
  /** null = unknown product code → client degrades to the subscription home. */
  product: { code: string; name: string } | null;
  /** Validated against the @vxture/shared five-tier ladder; invalid → null. */
  targetTier: Tier | null;
  metric: string | null;
  /** Representative subscription covering (active tenant × product), if any. */
  current: SubscribeCurrent | null;
  /** Pending offline order for this product, if any (product_320). */
  pendingOrder: PendingOrderSummary | null;
  /** Purchasable ladder: public active plans' current locked version, tier-sorted. */
  plans: SubscribePlanOption[];
}

// ── order endpoints (product_320 §4.4) ──────────────────────────────────────

interface CreateOrderBody {
  productCode: string;
  planVersionId: string;
  cycleUnit: string;
  intent: string;
  upgradeOfSubscriptionId?: string;
}

interface OfflinePaymentInstructions {
  method: "bank_transfer";
  accountName: string;
  bankName: string;
  accountNo: string;
  /** 汇款备注：客户填 orderNo，运营据此核销 */
  reference: string;
}

interface CreateOrderResult {
  status: "pending_payment" | "active";
  /** subscription row id (= admin orderId 语义)；free 即时开通时为 null */
  orderId: string | null;
  orderNo: string | null;
  billNo: string | null;
  amount: string | null;
  currency: string;
  planCode: string;
  cycleUnit: string | null;
  paymentInstructions: OfflinePaymentInstructions | null;
  /** free 即时开通时返回新订阅 id */
  subscriptionId: string | null;
}

interface MyOrderRecord {
  orderId: string;
  orderNo: string;
  billNo: string | null;
  planCode: string;
  planName: string;
  tier: string | null;
  cycleUnit: string;
  amount: string;
  currency: string;
  orderStatus: "pending" | "confirmed" | "closed";
  createdAt: string;
  confirmedAt: string | null;
}

interface SubscriptionActionBody {
  subscriptionId: string;
  action: SubscriptionAction;
  /** upgrade 操作必填 */
  planId?: string;
  /** pause / cancel 操作可选 */
  reason?: string;
  /** cancel 时是否立即生效，默认 false（到期取消） */
  immediate?: boolean;
}

// ============================================================================
// Router
// ============================================================================

@Controller("api/subscription")
export class SubscriptionRouter {
  private readonly logger = new Logger(SubscriptionRouter.name);

  constructor(
    @Inject(SubscriptionService)
    private readonly subscriptionService: SubscriptionService,
    @Inject(MailService)
    private readonly mailService: MailService,
    @Inject(COMMERCE_PG_POOL)
    private readonly pool: Pool,
  ) {}

  // --------------------------------------------------------------------------
  // GET /api/subscription/subscribe-context — /subscribe deep-link landing data
  //
  // The console side of the product→console conversion deep link (product_200
  // §3.2). Fault-tolerance contract (arda_303 §2.2): unknown intent → intent
  // null (client degrades to the subscription home) with a structured server
  // log — the observation channel that turns stray intents into vocabulary-
  // evolution signals; unknown target_tier/metric → dropped, flow proceeds.
  // --------------------------------------------------------------------------

  @Get("subscribe-context")
  async getSubscribeContext(
    @Req() req: Request & RequestContext,
    @Query()
    query: {
      product?: string;
      intent?: string;
      target_tier?: string;
      metric?: string;
    },
  ): Promise<SubscribeContext> {
    if (!req.tenant) throw new UnauthorizedException("租户上下文缺失");

    const rawIntent = query.intent?.trim() ?? "";
    const intent = (KNOWN_INTENTS as readonly string[]).includes(rawIntent)
      ? (rawIntent as SubscribeIntent)
      : null;
    if (intent === null) {
      // Deliberate warn (not debug): unknown intents are the demand signal for
      // vocabulary evolution (e.g. the reserved `seat`), surfaced proactively.
      this.logger.warn(
        `subscribe deeplink: unknown intent "${rawIntent}" (product=${query.product ?? "-"}) — degrading to subscription home`,
      );
    }

    const rawTier = query.target_tier?.trim() ?? "";
    const targetTier = (TIERS as readonly string[]).includes(rawTier)
      ? (rawTier as Tier)
      : null;
    if (rawTier && targetTier === null) {
      this.logger.warn(
        `subscribe deeplink: invalid target_tier "${rawTier}" ignored (product=${query.product ?? "-"})`,
      );
    }

    const metric = query.metric?.trim().slice(0, 64) || null;

    const rawProduct = query.product?.trim() ?? "";
    let product: SubscribeContext["product"] = null;
    if (PRODUCT_CODE_RE.test(rawProduct)) {
      const res = await this.pool.query<{
        product_code: string;
        product_name: string;
      }>(
        `select product_code, product_name from product.products
          where product_code = $1 and deleted_at is null`,
        [rawProduct],
      );
      const row = res.rows[0];
      if (row) product = { code: row.product_code, name: row.product_name };
    }
    if (product === null) {
      this.logger.warn(
        `subscribe deeplink: unknown product "${rawProduct}" — degrading to subscription home`,
      );
      return {
        intent,
        product: null,
        targetTier,
        metric,
        current: null,
        pendingOrder: null,
        plans: [],
      };
    }

    const [current, pendingOrder, plans] = await Promise.all([
      this.queryCurrentForProduct(req.tenant.id, product.code),
      this.queryPendingOrder(req.tenant.id, product.code),
      this.queryPlanLadder(product.code),
    ]);
    return {
      intent,
      product,
      targetTier,
      metric,
      current,
      pendingOrder,
      plans,
    };
  }

  /**
   * Representative subscription for (tenant × product): same selection rules
   * as the C2 engine — D10 predicate (never-paid lapsed trials read as absent)
   * + @shared status-order precedence, tie → latest period end (open end
   * counts latest).
   */
  private async queryCurrentForProduct(
    tenantId: string,
    productCode: string,
  ): Promise<SubscribeCurrent | null> {
    const res = await this.pool.query<{
      id: string;
      status: string;
      plan_version_id: string;
      end_at: Date | null;
      trial_end_at: Date | null;
      auto_renew: boolean;
      tier: string | null;
      plan_code: string;
    }>(
      `select ts.id, ts.status, ts.plan_version_id, ts.end_at, ts.trial_end_at,
              ts.auto_renew, pc.tier, pl.plan_code
         from metering.subscriptions ts
         join product.plan_components pc
           on pc.plan_version_id = ts.plan_version_id and pc.component_role = 'primary'
         join product.products prod
           on prod.id = pc.product_id and prod.product_code = $2
         join product.plan_versions pv on pv.id = ts.plan_version_id
         join product.plans pl on pl.id = pv.plan_id
        where ts.tenant_id = $1
          and ts.deleted_at is null
          and not (ts.subscription_kind = 'trial'
                   and ts.status in ('expired', 'cancelled'))
        order by array_position($3::text[], ts.status) asc,
                 ts.end_at desc nulls first
        limit 1`,
      [tenantId, productCode, [...SUBSCRIPTION_STATUSES]],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      subscriptionId: row.id,
      status: row.status,
      planCode: row.plan_code,
      planVersionId: row.plan_version_id,
      tier: row.tier,
      endAt: row.end_at?.toISOString() ?? null,
      trialEndAt: row.trial_end_at?.toISOString() ?? null,
      autoRenew: row.auto_renew,
    };
  }

  /** Public active plans whose CURRENT version is locked, with their prices. */
  private async queryPlanLadder(
    productCode: string,
  ): Promise<SubscribePlanOption[]> {
    const res = await this.pool.query<{
      plan_id: string;
      plan_code: string;
      plan_name: string;
      plan_version_id: string;
      tier: string;
      prices: SubscribePlanPrice[];
    }>(
      `select pl.id as plan_id, pl.plan_code, pl.plan_name,
              pv.id as plan_version_id, pc.tier,
              coalesce(
                jsonb_agg(jsonb_build_object(
                  'cycleUnit', pp.cycle_unit, 'cycleCount', pp.cycle_count,
                  'price', pp.price::text, 'currency', pp.currency
                ) order by pp.cycle_unit, pp.cycle_count)
                filter (where pp.id is not null), '[]'::jsonb
              ) as prices
         from product.products prod
         join product.plan_components pc
           on pc.product_id = prod.id and pc.component_role = 'primary'
         join product.plan_versions pv
           on pv.id = pc.plan_version_id and pv.is_locked = true
         join product.plans pl
           on pl.id = pv.plan_id and pl.current_version_id = pv.id
          and pl.deleted_at is null and pl.status = 'active'
          and pl.is_public = true and pl.is_customer_visible = true
         left join product.plan_prices pp on pp.plan_version_id = pv.id
        where prod.product_code = $1 and pc.tier is not null
        group by pl.id, pl.plan_code, pl.plan_name, pv.id, pc.tier`,
      [productCode],
    );
    const rank = (t: string) => {
      const i = (TIERS as readonly string[]).indexOf(t);
      return i < 0 ? Infinity : i;
    };
    return res.rows
      .map((r) => ({
        planId: r.plan_id,
        planCode: r.plan_code,
        planName: r.plan_name,
        planVersionId: r.plan_version_id,
        tier: r.tier,
        prices: r.prices,
      }))
      .sort(
        (a: SubscribePlanOption, b: SubscribePlanOption) =>
          rank(a.tier) - rank(b.tier),
      );
  }

  // --------------------------------------------------------------------------
  // GET /api/subscription/my — 查询当前租户的全部订阅
  // --------------------------------------------------------------------------

  @Get("my")
  async getMySubscriptions(
    @Req() req: Request & RequestContext,
  ): Promise<SubscriptionRecord[]> {
    if (!req.tenant) throw new UnauthorizedException("租户上下文缺失");
    const result = await this.subscriptionService.listSubscriptions({
      tenantId: req.tenant.id,
    });
    return result.items;
  }

  // --------------------------------------------------------------------------
  // POST /api/subscription/orders — 下单（线下支付，product_320 §4.4）
  //
  // free 档即时开通（不产生订单）；付费档产生 suspended 订阅 + unpaid 账单 = 订单，
  // 返回订单号 + 线下汇款指引，等 admin 人工确认收款后开通。intent = new|renew|upgrade。
  // 档位冲突/不可购买 → 409/400 语义码。
  // --------------------------------------------------------------------------

  @Post("orders")
  async createOrder(
    @Req() req: Request & RequestContext,
    @Body() body: CreateOrderBody,
  ): Promise<CreateOrderResult> {
    if (!req.user || !req.tenant) throw new UnauthorizedException("会话已失效");

    const productCode = (body?.productCode ?? "").trim();
    if (!PRODUCT_CODE_RE.test(productCode))
      throw new BadRequestException("productCode 非法");
    const planVersionId = (body?.planVersionId ?? "").trim();
    if (!planVersionId) throw new BadRequestException("planVersionId 不能为空");
    const cycleUnit = (body?.cycleUnit ?? "").trim();
    if (!(CYCLE_UNITS as readonly string[]).includes(cycleUnit))
      throw new BadRequestException("cycleUnit 必须是 month 或 year");
    const intent = (body?.intent ?? "").trim();
    if (!(ORDER_INTENTS as readonly string[]).includes(intent))
      throw new BadRequestException("intent 必须是 new/renew/upgrade");
    const upgradeOf = body?.upgradeOfSubscriptionId?.trim() || undefined;
    if (intent === "upgrade" && !upgradeOf)
      throw new BadRequestException("upgrade 需要 upgradeOfSubscriptionId");

    // 价格 + 套餐名：决定 free 短路 / 拒单（无价格行 = 企业版/不可自助购买）
    const plan = await this.lookupPlanPrice(planVersionId, cycleUnit);
    if (!plan)
      throw new BadRequestException({
        code: "NOT_PURCHASABLE",
        message: "该套餐/周期不可自助购买（如企业版请联系销售）",
      });

    const workspaceId = await this.resolveDefaultWorkspace(req.tenant.id);
    const createdBy = req.user.id;

    // upgrade 归属校验：目标订阅须属本租户
    if (intent === "upgrade" && upgradeOf) {
      const target = await this.subscriptionService
        .getSubscription(upgradeOf)
        .catch(() => null);
      if (!target || target.tenantId !== req.tenant.id)
        throw new BadRequestException("升级目标订阅不存在或无权操作");
    }

    // free 档：即时开通，不产生订单
    if (Number(plan.price) <= 0) {
      try {
        const sub = await this.subscriptionService.createSubscription({
          tenantId: req.tenant.id,
          workspaceId,
          planVersionId,
          cycleType: cycleUnit,
          startAt: new Date(),
          currency: plan.currency,
          createdBy,
          status: "active",
          subscriptionKind: "free",
          activationMethod: "free",
          createdByType: "customer",
          autoRenew: false,
        });
        return {
          status: "active",
          orderId: null,
          orderNo: null,
          billNo: null,
          amount: "0",
          currency: plan.currency,
          planCode: plan.planCode,
          cycleUnit,
          paymentInstructions: null,
          subscriptionId: sub.id,
        };
      } catch (err) {
        throw mapOrderError(err);
      }
    }

    // 付费档：产生线下订单（suspended 订阅 + unpaid 账单）
    try {
      const order = await this.subscriptionService.createOfflineOrder({
        tenantId: req.tenant.id,
        workspaceId,
        planVersionId,
        cycleUnit,
        price: Number(plan.price),
        currency: plan.currency,
        createdBy,
        intent: intent as OrderCreateIntent,
        ...(upgradeOf ? { upgradeOfSubscriptionId: upgradeOf } : {}),
        itemName: plan.planName,
      });
      return {
        status: "pending_payment",
        orderId: order.subscription.id,
        orderNo: order.orderNo,
        billNo: order.billNo,
        amount: String(plan.price),
        currency: plan.currency,
        planCode: plan.planCode,
        cycleUnit,
        paymentInstructions: buildPaymentInstructions(order.orderNo),
        subscriptionId: null,
      };
    } catch (err) {
      throw mapOrderError(err);
    }
  }

  // GET /api/subscription/orders — 我的订单（租户维度合成视图）
  @Get("orders")
  async getMyOrders(
    @Req() req: Request & RequestContext,
  ): Promise<MyOrderRecord[]> {
    if (!req.tenant) throw new UnauthorizedException("租户上下文缺失");
    const res = await this.pool.query<MyOrderRow>(MY_ORDERS_SQL, [
      req.tenant.id,
    ]);
    return res.rows.map(mapMyOrderRow);
  }

  // POST /api/subscription/orders/:orderId/cancel — 客户取消未付订单
  @Post("orders/:orderId/cancel")
  async cancelOrder(
    @Req() req: Request & RequestContext,
    @Param("orderId") orderId: string,
    @Body() body: { reason?: string },
  ): Promise<{ orderId: string; status: string }> {
    if (!req.user || !req.tenant) throw new UnauthorizedException("会话已失效");
    const id = orderId?.trim();
    if (!id) throw new BadRequestException("orderId 不能为空");

    // 归属校验
    const sub = await this.subscriptionService
      .getSubscription(id)
      .catch(() => null);
    if (!sub || sub.tenantId !== req.tenant.id)
      throw new BadRequestException("订单不存在或无权操作");

    try {
      const updated = await this.subscriptionService.cancelPendingOrder(id, {
        actorType: "customer",
        actorId: req.user.id,
        ...(body?.reason ? { remark: body.reason } : {}),
      });
      return { orderId: updated.id, status: updated.status };
    } catch (err) {
      throw mapOrderError(err);
    }
  }

  /**
   * Pending offline order for (tenant × product): suspended + offline_purchase
   * subscription with an unpaid invoice (product_320 §2 O1 判定谓词).
   */
  private async queryPendingOrder(
    tenantId: string,
    productCode: string,
  ): Promise<PendingOrderSummary | null> {
    const res = await this.pool.query<{
      order_id: string;
      order_no: string;
      bill_no: string | null;
      plan_code: string;
      tier: string | null;
      cycle_unit: string;
      pay_amount: string | null;
      currency: string;
      created_at: Date;
    }>(
      `select sub.id as order_id, sub.order_no, inv.bill_no,
              plan.plan_code, pc.tier, sub.cycle_unit, sub.pay_amount, sub.currency,
              sub.created_at
         from metering.subscriptions sub
         join product.plan_versions pv on pv.id = sub.plan_version_id
         join product.plans plan on plan.id = pv.plan_id
         join product.plan_components pc
           on pc.plan_version_id = sub.plan_version_id and pc.component_role = 'primary'
         join product.products prod on prod.id = pc.product_id
         join lateral (
           select id, bill_no from billing.invoices i
            where i.subscription_id = sub.id and i.bill_status = 'unpaid' and i.deleted_at is null
            order by i.created_at desc limit 1
         ) inv on true
        where sub.tenant_id = $1
          and prod.product_code = $2
          and sub.status = 'suspended'
          and sub.activation_method = 'offline_purchase'
          and sub.deleted_at is null
        order by sub.created_at desc
        limit 1`,
      [tenantId, productCode],
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      orderId: r.order_id,
      orderNo: r.order_no,
      billNo: r.bill_no,
      planCode: r.plan_code,
      tier: r.tier,
      cycleUnit: r.cycle_unit,
      amount: r.pay_amount ?? "0",
      currency: r.currency,
      createdAt: r.created_at.toISOString(),
    };
  }

  /** 服务端解析租户 default workspace（不信任 req.tenant.workspace 字符串）。 */
  private async resolveDefaultWorkspace(tenantId: string): Promise<string> {
    const res = await this.pool.query<{ id: string }>(
      `select id from tenancy.workspaces
        where tenant_id = $1 and is_default and deleted_at is null
        limit 1`,
      [tenantId],
    );
    const id = res.rows[0]?.id;
    if (!id) throw new BadRequestException("租户缺少默认工作空间");
    return id;
  }

  /** 查 (plan_version, cycle) 的价格 + 套餐名；无价格行返回 null（不可自助购买）。 */
  private async lookupPlanPrice(
    planVersionId: string,
    cycleUnit: string,
  ): Promise<{
    price: string;
    currency: string;
    planCode: string;
    planName: string;
  } | null> {
    const res = await this.pool.query<{
      price: string;
      currency: string;
      plan_code: string;
      plan_name: string;
    }>(
      `select pp.price, pp.currency, plan.plan_code, plan.plan_name
         from product.plan_prices pp
         join product.plan_versions pv on pv.id = pp.plan_version_id
         join product.plans plan on plan.id = pv.plan_id
        where pp.plan_version_id = $1 and pp.cycle_unit = $2 and pp.cycle_count = 1
          and plan.current_version_id = pv.id
          and plan.status = 'active' and plan.is_public = true
        limit 1`,
      [planVersionId, cycleUnit],
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      price: r.price,
      currency: r.currency,
      planCode: r.plan_code,
      planName: r.plan_name,
    };
  }

  // --------------------------------------------------------------------------
  // POST /api/subscription/actions — 执行订阅变更操作
  // --------------------------------------------------------------------------

  @Post("actions")
  async executeAction(
    @Req() req: Request & RequestContext,
    @Body() body: SubscriptionActionBody,
  ): Promise<SubscriptionRecord> {
    if (!req.user || !req.tenant) throw new UnauthorizedException("会话已失效");

    const { subscriptionId, action, planId, reason } = body ?? {};

    // ── 入参校验 ──────────────────────────────────────────────────────────
    if (!subscriptionId?.trim())
      throw new BadRequestException("subscriptionId 不能为空");

    const VALID: SubscriptionAction[] = [
      "upgrade",
      "pause",
      "resume",
      "cancel",
    ];
    if (!VALID.includes(action))
      throw new BadRequestException(`无效操作类型：${String(action)}`);

    if (action === "upgrade" && !planId?.trim()) {
      throw new BadRequestException("upgrade 操作需要提供 planId");
    }

    // ── 查订阅并校验租户归属 ──────────────────────────────────────────────
    let current: SubscriptionRecord;
    try {
      current = await this.subscriptionService.getSubscription(subscriptionId);
    } catch {
      throw new BadRequestException("订阅不存在");
    }

    if (current.tenantId !== req.tenant.id) {
      throw new UnauthorizedException("无权操作该订阅");
    }

    // ── 执行操作 ──────────────────────────────────────────────────────────
    const changedBy = req.user.email;
    let updated!: SubscriptionRecord;
    try {
      if (action === "upgrade") {
        // product_320 §4.4: 付费升级一律走下单流程（POST /orders, intent=upgrade）。
        // 真实定价落库后，此处直接换版会绕过计费 = 免费升级洞，堵死。
        throw new BadRequestException(
          "升级请通过下单流程完成：POST /api/subscription/orders (intent=upgrade)",
        );
      } else if (action === "pause") {
        // 'suspended' per the @vxture/shared six-value domain — the legacy
        // 'paused' literal never existed in the DDL CHECK and threw at write
        // time; actor_type CHECK only admits system/customer/operator, so the
        // legacy 'user' literal is 'customer' here (self-service actor).
        updated = await this.subscriptionService.updateSubscription(
          subscriptionId,
          {
            status: "suspended",
            operatorType: "customer",
            ...(changedBy
              ? { operatorId: changedBy, updatedBy: changedBy }
              : {}),
            ...(reason ? { operatorRemark: reason } : {}),
          },
        );
      } else if (action === "resume") {
        updated = await this.subscriptionService.updateSubscription(
          subscriptionId,
          {
            status: "active",
            operatorType: "customer",
            ...(changedBy
              ? { operatorId: changedBy, updatedBy: changedBy }
              : {}),
          },
        );
      } else {
        updated = await this.subscriptionService.cancelSubscription(
          subscriptionId,
          changedBy,
          reason,
        );
      }
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : "订阅操作失败",
      );
    }

    // ── 发送确认邮件（失败不阻断主流程）─────────────────────────────────
    void this.mailService
      .send(buildActionEmail(req.user.email, action, updated))
      .catch(() => {});

    return updated;
  }
}

// ============================================================================
// 内部：构建操作确认邮件
// ============================================================================

const ACTION_LABELS: Record<SubscriptionAction, string> = {
  upgrade: "套餐升级",
  pause: "订阅暂停",
  resume: "订阅恢复",
  cancel: "订阅取消",
};

function buildActionEmail(
  to: string,
  action: SubscriptionAction,
  sub: SubscriptionRecord,
) {
  const label = ACTION_LABELS[action];
  const subject = `[Vxture] 您的${label}操作已完成`;
  const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e">
  <h2 style="margin-bottom:8px">${label}成功</h2>
  <p style="color:#555">您好，您的订阅操作已处理完成，详情如下：</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <tr style="background:#f5f5f5">
      <td style="padding:10px 12px;color:#888;width:120px">订阅 ID</td>
      <td style="padding:10px 12px">${sub.id}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;color:#888">套餐 ID</td>
      <td style="padding:10px 12px">${sub.planVersionId}</td>
    </tr>
    <tr style="background:#f5f5f5">
      <td style="padding:10px 12px;color:#888">当前状态</td>
      <td style="padding:10px 12px">${sub.status}</td>
    </tr>
  </table>
  <p style="color:#aaa;font-size:12px;margin-top:24px">
    如有疑问，请联系 Vxture 支持团队。<br>
    此邮件由系统自动发送，请勿回复。
  </p>
</div>`;

  return { to, subject, html };
}

// ============================================================================
// 内部：订单 helpers（product_320 §4.4）
// ============================================================================

/** ConflictException（档位冲突等）→ 保持 409；其余 → 400。 */
function mapOrderError(err: unknown): Error {
  if (err instanceof ConflictException) return err;
  return new BadRequestException(
    err instanceof Error ? err.message : "订单操作失败",
  );
}

/**
 * 线下汇款指引：收款账户来自平台配置（env）；未配置时字段留空占位，由 owner
 * 注入真实账户（product_320 §8 待办①）。reference = orderNo（运营据此核销）。
 */
function buildPaymentInstructions(orderNo: string): OfflinePaymentInstructions {
  return {
    method: "bank_transfer",
    accountName: process.env.OFFLINE_PAY_ACCOUNT_NAME ?? "",
    bankName: process.env.OFFLINE_PAY_BANK_NAME ?? "",
    accountNo: process.env.OFFLINE_PAY_ACCOUNT_NO ?? "",
    reference: orderNo,
  };
}

interface MyOrderRow {
  order_id: string;
  order_no: string;
  bill_no: string | null;
  plan_code: string | null;
  plan_name: string | null;
  tier: string | null;
  cycle_unit: string;
  pay_amount: string | null;
  currency: string | null;
  sub_status: string;
  bill_status: string | null;
  pay_status: string | null;
  paid_at: Date | null;
  created_at: Date;
}

const MY_ORDERS_SQL = `
select
  sub.id               as order_id,
  sub.order_no,
  inv.bill_no,
  plan.plan_code,
  plan.plan_name,
  pc.tier,
  sub.cycle_unit,
  sub.pay_amount,
  sub.currency,
  sub.status           as sub_status,
  inv.bill_status,
  pay.pay_status,
  inv.paid_at,
  sub.created_at
from metering.subscriptions sub
left join product.plan_versions pv on pv.id = sub.plan_version_id
left join product.plans plan on plan.id = pv.plan_id
left join lateral (
  select tier from product.plan_components
   where plan_version_id = sub.plan_version_id and component_role = 'primary' limit 1
) pc on true
left join lateral (
  select id, bill_no, bill_status, paid_at from billing.invoices i
   where i.subscription_id = sub.id and i.deleted_at is null
   order by i.created_at desc limit 1
) inv on true
left join lateral (
  select pay_status from billing.payments p where p.bill_id = inv.id
   order by p.created_at desc limit 1
) pay on true
where sub.tenant_id = $1 and sub.order_no is not null and sub.deleted_at is null
order by sub.created_at desc
limit 100
`;

function mapMyOrderRow(r: MyOrderRow): MyOrderRecord {
  const orderStatus: MyOrderRecord["orderStatus"] =
    r.bill_status === "paid" || r.pay_status === "paid"
      ? "confirmed"
      : r.sub_status === "cancelled" || r.bill_status === "cancelled"
        ? "closed"
        : "pending";
  return {
    orderId: r.order_id,
    orderNo: r.order_no,
    billNo: r.bill_no,
    planCode: r.plan_code ?? "",
    planName: r.plan_name ?? "",
    tier: r.tier,
    cycleUnit: r.cycle_unit,
    amount: r.pay_amount ?? "0",
    currency: r.currency ?? "CNY",
    orderStatus,
    createdAt: r.created_at.toISOString(),
    confirmedAt: r.paid_at ? r.paid_at.toISOString() : null,
  };
}
