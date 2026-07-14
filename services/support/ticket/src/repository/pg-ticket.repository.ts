import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { SUPPORT_PG_POOL } from "../tokens";
import type {
  TicketRecord,
  TicketEventRecord,
  AuditLogRecord,
  ListTicketsParams,
  ListTicketsResult,
  CreateTicketInput,
  UpdateTicketInput,
  AddTicketEventInput,
  AppendAuditLogInput,
} from "../types/ticket.types";

interface TicketRow {
  id: string;
  tenant_id: string;
  account_id: string | null;
  ticket_no: string;
  category: string;
  priority: string;
  source: string;
  status: string;
  title: string;
  description: string;
  reporter_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  tags: string[];
  satisfaction_score: number | null;
  satisfaction_comment: string | null;
  sla_breach_at: Date | null;
  first_response_at: Date | null;
  due_at: Date | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface EventRow {
  id: string;
  ticket_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

interface AuditRow {
  id: string;
  actor_type: string;
  actor_id: string;
  tenant_id: string | null;
  action: string;
  result: string;
  resource_type: string;
  resource_id: string;
  error_code: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  request_id: string | null;
  duration_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

@Injectable()
export class PgTicketRepository {
  constructor(@Inject(SUPPORT_PG_POOL) private readonly pool: Pool) {}

  async listTickets(params: ListTicketsParams): Promise<ListTicketsResult> {
    const conditions: string[] = ["deleted_at is null"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.tenantId) {
      conditions.push(`tenant_id = $${idx++}`);
      values.push(params.tenantId);
    }
    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }
    if (params.priority) {
      conditions.push(`priority = $${idx++}`);
      values.push(params.priority);
    }
    if (params.category) {
      conditions.push(`category = $${idx++}`);
      values.push(params.category);
    }
    if (params.assigneeId) {
      conditions.push(`assignee_id = $${idx++}`);
      values.push(params.assigneeId);
    }
    if (params.keyword) {
      conditions.push(`(title ilike $${idx} or ticket_no ilike $${idx})`);
      values.push(`%${params.keyword}%`);
      idx++;
    }

    const where = conditions.join(" and ");
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from support.tickets where ${where}`,
        values,
      ),
      this.pool.query<TicketRow>(
        `select * from support.tickets where ${where}
         order by priority asc, updated_at desc
         limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapTicket),
    };
  }

  async getById(id: string): Promise<TicketRecord | null> {
    const result = await this.pool.query<TicketRow>(
      `select * from support.tickets where id = $1 and deleted_at is null limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapTicket(row) : null;
  }

  async create(input: CreateTicketInput): Promise<TicketRecord> {
    const ticketNo = generateTicketNo();
    const result = await this.pool.query<TicketRow>(
      `insert into support.tickets (
        tenant_id, account_id, ticket_no, category, priority, source,
        status, title, description, reporter_name, tags, due_at,
        created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6,
        'open', $7, $8, $9, $10, $11,
        now(), now()
      ) returning *`,
      [
        input.tenantId,
        input.accountId ?? null,
        ticketNo,
        input.category ?? "general",
        input.priority ?? "p2",
        input.source ?? "console",
        input.title,
        input.description ?? "",
        input.reporterName ?? null,
        input.tags ?? [],
        input.dueAt ?? null,
      ],
    );
    return this.mapTicket(result.rows[0]!);
  }

  async update(
    id: string,
    input: UpdateTicketInput,
  ): Promise<TicketRecord | null> {
    const sets: string[] = ["updated_at = now()"];
    const values: unknown[] = [id];
    let idx = 2;

    if (input.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(input.status);
    }
    if (input.priority !== undefined) {
      sets.push(`priority = $${idx++}`);
      values.push(input.priority);
    }
    if (input.assigneeId !== undefined) {
      sets.push(`assignee_id = $${idx++}`);
      values.push(input.assigneeId);
    }
    if (input.assigneeName !== undefined) {
      sets.push(`assignee_name = $${idx++}`);
      values.push(input.assigneeName);
    }
    if (input.title !== undefined) {
      sets.push(`title = $${idx++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(input.description);
    }
    if (input.tags !== undefined) {
      sets.push(`tags = $${idx++}`);
      values.push(input.tags);
    }
    if (input.resolvedAt !== undefined) {
      sets.push(`resolved_at = $${idx++}`);
      values.push(input.resolvedAt);
    }
    if (input.closedAt !== undefined) {
      sets.push(`closed_at = $${idx++}`);
      values.push(input.closedAt);
    }
    if (input.satisfactionScore !== undefined) {
      sets.push(`satisfaction_score = $${idx++}`);
      values.push(input.satisfactionScore);
    }
    if (input.satisfactionComment !== undefined) {
      sets.push(`satisfaction_comment = $${idx++}`);
      values.push(input.satisfactionComment);
    }

    const result = await this.pool.query<TicketRow>(
      `update support.tickets set ${sets.join(", ")}
       where id = $1 and deleted_at is null
       returning *`,
      values,
    );
    const row = result.rows[0];
    return row ? this.mapTicket(row) : null;
  }

  async addEvent(input: AddTicketEventInput): Promise<TicketEventRecord> {
    const result = await this.pool.query<EventRow>(
      `insert into support.ticket_comments (
        ticket_id, event_type, actor_type, actor_id, actor_name, payload, created_at
      ) values ($1, $2, $3, $4, $5, $6, now())
      returning *`,
      [
        input.ticketId,
        input.eventType,
        input.actorType,
        input.actorId ?? null,
        input.actorName,
        JSON.stringify(input.payload ?? {}),
      ],
    );
    return this.mapEvent(result.rows[0]!);
  }

  async getEvents(ticketId: string): Promise<TicketEventRecord[]> {
    const result = await this.pool.query<EventRow>(
      `select * from support.ticket_comments where ticket_id = $1 order by created_at asc`,
      [ticketId],
    );
    return result.rows.map(this.mapEvent);
  }

  async appendAuditLog(input: AppendAuditLogInput): Promise<AuditLogRecord> {
    const result = await this.pool.query<AuditRow>(
      `insert into support.audit_logs (
        actor_type, actor_id, tenant_id, action, result,
        resource_type, resource_id, error_code,
        before, after, request_id, duration_ms,
        ip_address, user_agent, created_at
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, now()
      ) returning *`,
      [
        input.actorType,
        input.actorId,
        input.tenantId ?? null,
        input.action,
        input.result ?? "success",
        input.resourceType,
        input.resourceId,
        input.errorCode ?? null,
        input.before ? JSON.stringify(input.before) : null,
        input.after ? JSON.stringify(input.after) : null,
        input.requestId ?? null,
        input.durationMs ?? null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ],
    );
    return this.mapAudit(result.rows[0]!);
  }

  async listAuditLogs(params: {
    actorId?: string;
    tenantId?: string;
    action?: string;
    resourceType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: AuditLogRecord[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.actorId) {
      conditions.push(`actor_id = $${idx++}`);
      values.push(params.actorId);
    }
    if (params.tenantId) {
      conditions.push(`tenant_id = $${idx++}`);
      values.push(params.tenantId);
    }
    if (params.action) {
      conditions.push(`action = $${idx++}`);
      values.push(params.action);
    }
    if (params.resourceType) {
      conditions.push(`resource_type = $${idx++}`);
      values.push(params.resourceType);
    }

    const where = conditions.length ? conditions.join(" and ") : "true";
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from support.audit_logs where ${where}`,
        values,
      ),
      this.pool.query<AuditRow>(
        `select * from support.audit_logs where ${where}
         order by created_at desc limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapAudit),
    };
  }

  private mapTicket(row: TicketRow): TicketRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      accountId: row.account_id,
      ticketNo: row.ticket_no,
      category: row.category,
      priority: row.priority,
      source: row.source,
      status: row.status,
      title: row.title,
      description: row.description,
      reporterName: row.reporter_name,
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      tags: row.tags,
      satisfactionScore: row.satisfaction_score,
      satisfactionComment: row.satisfaction_comment,
      slaBreachAt: row.sla_breach_at,
      firstResponseAt: row.first_response_at,
      dueAt: row.due_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private mapEvent(row: EventRow): TicketEventRecord {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      eventType: row.event_type,
      actorType: row.actor_type,
      actorId: row.actor_id,
      actorName: row.actor_name,
      payload: row.payload,
      createdAt: row.created_at,
    };
  }

  private mapAudit(row: AuditRow): AuditLogRecord {
    return {
      id: row.id,
      actorType: row.actor_type,
      actorId: row.actor_id,
      tenantId: row.tenant_id,
      action: row.action,
      result: row.result,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      errorCode: row.error_code,
      before: row.before,
      after: row.after,
      requestId: row.request_id,
      durationMs: row.duration_ms,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }
}

function generateTicketNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `TK-${ts}${rand}`;
}
