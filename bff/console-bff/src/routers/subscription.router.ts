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
  Controller,
  Get,
  Inject,
  Logger,
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
 * is deliberately NOT in this set.
 */
const KNOWN_INTENTS = ["upgrade", "renew", "addon"] as const;
type SubscribeIntent = (typeof KNOWN_INTENTS)[number];

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
  /** Purchasable ladder: public active plans' current locked version, tier-sorted. */
  plans: SubscribePlanOption[];
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
        plans: [],
      };
    }

    const [current, plans] = await Promise.all([
      this.queryCurrentForProduct(req.tenant.id, product.code),
      this.queryPlanLadder(product.code),
    ]);
    return { intent, product, targetTier, metric, current, plans };
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
        updated = await this.subscriptionService.upgradeSubscription(
          subscriptionId,
          planId!,
          changedBy,
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
