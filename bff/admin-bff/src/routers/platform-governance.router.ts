import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { Pool } from "pg";
import { ADMIN_BFF_RO_POOL } from "../tokens";
import type {
  PlatformGovernanceKind,
  PlatformGovernanceRecord,
  PlatformGovernanceStatus,
  RequestContext,
} from "../types/console.types";

@Controller("api/platform-governance")
export class PlatformGovernanceRouter {
  constructor(@Inject(ADMIN_BFF_RO_POOL) private readonly pool: Pool) {}

  @Get(":kind")
  async listGovernanceRecords(
    @Req() req: Request & RequestContext,
    @Param("kind") kind: PlatformGovernanceKind,
  ): Promise<PlatformGovernanceRecord[]> {
    assertCanReadPlatformGovernance(req);

    const tableCheck = await this.pool.query<{ table_name: string | null }>(
      "select to_regclass('admin.governance_record')::text as table_name",
    );
    if (!tableCheck.rows[0]?.table_name) {
      // Q1（docs/product/platform/admin/admin-app-completion-plan.md）：密钥/任务/审批三类治理
      // 暂无 SoT 表（admin.governance_record 未建，不投机建 schema）。优雅返回空而非 502——
      // 页面可访问、空态显示；一旦该表按产品定义落库，本路由自动亮起。
      return [];
    }

    const rows = await this.pool.query<PlatformGovernanceRow>(
      PLATFORM_GOVERNANCE_SQL,
      [kind],
    );
    return rows.rows.map(mapGovernanceRow);
  }
}

function assertCanReadPlatformGovernance(req: Request & RequestContext): void {
  if (!req.user) {
    throw new UnauthorizedException("No active session");
  }

  // NOTE: platform.admin.manage was in this disjunct but no perm_code or bridge
  // ever produces it (dead check, removed). These pages back onto the not-yet-built
  // admin.governance_record table (Q1) and return empty; gate stays on the two
  // capabilities that actually exist until the SoT + a dedicated code are defined.
  if (
    !req.capabilities ||
    (!req.capabilities.includes("platform.model.manage") &&
      !req.capabilities.includes("audit:read"))
  ) {
    throw new ForbiddenException("Missing platform governance capability");
  }
}

function normalizeStatus(status: string): PlatformGovernanceStatus {
  if (status === "warning" || status === "blocked" || status === "pending")
    return status;
  return "normal";
}

function toDisplayTime(value: Date | string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value instanceof Date ? value : new Date(value));
}

function mapGovernanceRow(
  row: PlatformGovernanceRow,
): PlatformGovernanceRecord {
  return {
    id: row.id,
    name: row.name,
    status: normalizeStatus(row.status),
    scope: row.scope,
    owner: row.owner,
    policy: row.policy,
    updatedAt: toDisplayTime(row.updated_at),
    description: row.description,
    tags: row.tags ?? [],
  };
}

const PLATFORM_GOVERNANCE_SQL = `
select
  id,
  name,
  status,
  scope,
  owner,
  policy,
  updated_at,
  description,
  tags
from admin.governance_record
where kind = $1
  and deleted_at is null
order by updated_at desc, id asc
`;

interface PlatformGovernanceRow {
  id: string;
  name: string;
  status: string;
  scope: string;
  owner: string;
  policy: string;
  updated_at: Date | string | null;
  description: string;
  tags: string[] | null;
}
