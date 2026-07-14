/**
 * billing.router.ts - 租户账单路由
 * @package @vxture/bff-console
 *
 * 提供当前租户的账单数据查询接口：
 *   GET /api/billing/invoices  — 发票列表（最近 N 条）
 *   GET /api/billing/overview  — 账单概览统计
 *
 * 全部接口需要租户上下文（由 TenantMiddleware 保证 req.tenant 已填充）。
 *
 * @author AI-Generated
 * @date 2026-05-03
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Application
 * @category Router
 */

import {
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { BillingService } from "@vxture/service-billing";
import type { InvoiceRecord } from "@vxture/service-billing";
import type { RequestContext } from "../types/console.types";

// ============================================================================
// BillingRouter
// ============================================================================

export interface BillingOverview {
  total: number;
  paid: number;
  pending: number;
  cancelled: number;
}

@Controller("api/billing")
export class BillingRouter {
  constructor(
    @Inject(BillingService)
    private readonly billingService: BillingService,
  ) {}

  // ── GET /api/billing/invoices ──────────────────────────────────────────────

  /**
   * 返回当前租户最近的发票列表。
   * 默认最多返回 20 条，可通过 ?limit=N 调整（上限 100）。
   */
  @Get("invoices")
  async getInvoices(
    @Req() req: Request & RequestContext,
    @Query("limit") limit?: string,
  ): Promise<InvoiceRecord[]> {
    if (!req.tenant) {
      throw new UnauthorizedException("租户上下文缺失");
    }

    const pageSize = Math.min(Number(limit) || 20, 100);
    const result = await this.billingService.listInvoices({
      tenantId: req.tenant.id,
      pageSize,
    });
    return result.items;
  }

  // ── GET /api/billing/overview ──────────────────────────────────────────────

  /**
   * 返回当前租户的账单概览统计：总数、已付、待付、已取消。
   */
  @Get("overview")
  async getOverview(
    @Req() req: Request & RequestContext,
  ): Promise<BillingOverview> {
    if (!req.tenant) {
      throw new UnauthorizedException("租户上下文缺失");
    }

    const result = await this.billingService.listInvoices({
      tenantId: req.tenant.id,
      pageSize: 200,
    });

    const items = result.items;
    return {
      total: items.length,
      paid: items.filter((i) => i.billStatus === "paid").length,
      pending: items.filter((i) => i.billStatus === "pending").length,
      cancelled: items.filter((i) => i.billStatus === "cancelled").length,
    };
  }
}
