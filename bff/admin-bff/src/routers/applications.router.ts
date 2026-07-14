import { Controller, Get, Inject, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { Req } from "@nestjs/common";
import type { Pool } from "pg";
import { ADMIN_BFF_RO_POOL } from "../tokens";
import type { RequestContext } from "../types/console.types";

export interface ApplicationRecord {
  id: string;
  appCode: string;
  appName: string;
  appNameZh: string | null;
  appType: string;
  sort: number;
  status: string;
}

interface ApplicationRow {
  id: string;
  app_code: string;
  app_name: string;
  app_name_zh: string | null;
  app_type: string;
  sort: number;
  status: string;
}

@Controller("api/applications")
export class ApplicationsRouter {
  constructor(@Inject(ADMIN_BFF_RO_POOL) private readonly roPool: Pool) {}

  @Get()
  async listApplications(
    @Req() req: Request & RequestContext,
  ): Promise<ApplicationRecord[]> {
    if (!req.user) throw new UnauthorizedException("No active session");

    // The old application table merged into product.products; the retired i18n
    // table is replaced by dual-name columns product_name (primary) / product_nick.
    const res = await this.roPool.query<ApplicationRow>(
      `SELECT p.id,
              p.product_code AS app_code,
              COALESCE(p.product_name, p.product_code) AS app_name,
              p.product_nick AS app_name_zh,
              p.product_type AS app_type,
              p.sort,
              p.status
       FROM product.products p
       WHERE p.deleted_at IS NULL
       ORDER BY p.sort ASC, p.product_code ASC`,
    );

    return res.rows.map((r) => ({
      id: r.id,
      appCode: r.app_code,
      appName: r.app_name,
      appNameZh: r.app_name_zh,
      appType: r.app_type,
      sort: r.sort,
      status: r.status,
    }));
  }
}
