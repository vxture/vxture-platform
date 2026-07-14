/**
 * audit.repository.ts - VardaAuditLog 持久化仓库
 * @package varda-server
 * @layer Application
 * @category Repository
 *
 * @description
 *   封装 VardaAuditLog 表的写入与查询。
 *   执行类工具（requiresConfirmation=true）在 ToolRegistry 中调用 create() 写入审计记录；
 *   确认接口调用 claimForExecution() 原子领取执行权，取消接口调用 markCancelled() 写入时间戳。
 *
 *   记录三态语义：
 *     pending   : confirmed=false  AND cancelledAt IS NULL
 *     confirmed : confirmed=true
 *     cancelled : cancelledAt IS NOT NULL
 *
 * @author AI-Generated
 * @date 2026-05-01
 */

import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

// ============================================================================
// 类型定义
// ============================================================================

export interface VardaAuditLogRecord {
  id: string;
  userId: string;
  tenantId: string | null;
  surface: string;
  toolId: string;
  input: unknown;
  result: unknown;
  confirmed: boolean;
  cancelledAt: Date | null;
  executedAt: Date;
}

export interface VardaAuditLogCreateInput {
  userId: string;
  tenantId: string | null;
  surface: string;
  toolId: string;
  input: unknown;
  result: unknown;
  confirmed: boolean;
}

interface VardaAuditLogRow {
  id: string;
  userId: string;
  tenantId: string | null;
  surface: string;
  toolId: string;
  input: unknown;
  result: unknown;
  confirmed: boolean;
  cancelledAt: Date | null;
  executedAt: Date;
}

// ============================================================================
// Repository
// ============================================================================

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 写入一条审计记录，返回含 id 的完整记录（id 供后续 updateConfirmed 使用）。 */
  async create(data: VardaAuditLogCreateInput): Promise<VardaAuditLogRecord> {
    const id = randomUUID();
    const rows = (await this.prisma.$queryRawUnsafe(
      `INSERT INTO "VardaAuditLog" (id, "userId", "tenantId", surface, "toolId", input, result, confirmed, "executedAt")
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, NOW())
       RETURNING id, "userId", "tenantId", surface, "toolId", input, result, confirmed, "cancelledAt", "executedAt"`,
      id,
      data.userId,
      data.tenantId,
      data.surface,
      data.toolId,
      JSON.stringify(data.input),
      JSON.stringify(data.result),
      data.confirmed,
    )) as VardaAuditLogRow[];
    return toAuditRecord(rows[0]!);
  }

  /** 确认接口：同时更新 confirmed 标志和工具执行结果。 */
  async updateExecution(
    id: string,
    confirmed: boolean,
    result: unknown,
  ): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      'UPDATE "VardaAuditLog" SET confirmed = $2, result = $3::jsonb WHERE id = $1',
      id,
      confirmed,
      JSON.stringify(result),
    );
  }

  /** 取消操作：写入 cancelledAt 时间戳，永久标记此记录为已取消，后续无法再确认执行。 */
  async markCancelled(id: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      'UPDATE "VardaAuditLog" SET "cancelledAt" = NOW() WHERE id = $1',
      id,
    );
  }

  /**
   * 原子性领取执行权：仅当 confirmed=false 且 cancelledAt IS NULL 时将 confirmed 置为 true。
   * 双重防护：
   *   - confirmed=false 防止双重执行（TOCTOU）
   *   - cancelledAt IS NULL 防止已取消的记录被重新确认
   * 并发请求中只有一个能成功（PostgreSQL 行级锁），返回 null 表示已被抢先或已取消。
   */
  async claimForExecution(id: string): Promise<VardaAuditLogRecord | null> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `UPDATE "VardaAuditLog"
       SET confirmed = true
       WHERE id = $1 AND confirmed = false AND "cancelledAt" IS NULL
       RETURNING id, "userId", "tenantId", surface, "toolId", input, result, confirmed, "cancelledAt", "executedAt"`,
      id,
    )) as VardaAuditLogRow[];
    return rows[0] ? toAuditRecord(rows[0]) : null;
  }

  /** 按 id 查询，供确认接口校验记录归属。 */
  async findById(id: string): Promise<VardaAuditLogRecord | null> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT id, "userId", "tenantId", surface, "toolId", input, result, confirmed, "cancelledAt", "executedAt"
       FROM "VardaAuditLog"
       WHERE id = $1
       LIMIT 1`,
      id,
    )) as VardaAuditLogRow[];
    return rows[0] ? toAuditRecord(rows[0]) : null;
  }
}

// ============================================================================
// 内部转换
// ============================================================================

function toAuditRecord(row: VardaAuditLogRow): VardaAuditLogRecord {
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    surface: row.surface,
    toolId: row.toolId,
    input: row.input,
    result: row.result,
    confirmed: row.confirmed,
    cancelledAt: row.cancelledAt,
    executedAt: row.executedAt,
  };
}
