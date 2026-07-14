export enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
  CRITICAL = "critical",
}

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export interface TicketRecord {
  id: string;
  tenantId: string;
  accountId: string | null;
  ticketNo: string;
  category: string;
  priority: string;
  source: string;
  status: string;
  title: string;
  description: string;
  reporterName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  tags: string[];
  satisfactionScore: number | null;
  satisfactionComment: string | null;
  slaBreachAt: Date | null;
  firstResponseAt: Date | null;
  dueAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TicketEventRecord {
  id: string;
  ticketId: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  actorName: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: string;
  actorType: string;
  actorId: string;
  tenantId: string | null;
  action: string;
  result: string;
  resourceType: string;
  resourceId: string;
  errorCode: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  requestId: string | null;
  durationMs: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ListTicketsParams {
  tenantId?: string;
  status?: string;
  priority?: string;
  category?: string;
  assigneeId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ListTicketsResult {
  items: TicketRecord[];
  total: number;
}

export interface CreateTicketInput {
  tenantId: string;
  accountId?: string;
  category?: string;
  priority?: string;
  source?: string;
  title: string;
  description?: string;
  reporterName?: string;
  tags?: string[];
  dueAt?: Date;
}

export interface UpdateTicketInput {
  status?: string;
  priority?: string;
  assigneeId?: string;
  assigneeName?: string;
  title?: string;
  description?: string;
  tags?: string[];
  resolvedAt?: Date;
  closedAt?: Date;
  satisfactionScore?: number;
  satisfactionComment?: string;
}

export interface AddTicketEventInput {
  ticketId: string;
  eventType: string;
  actorType: string;
  actorId?: string;
  actorName: string;
  payload?: Record<string, unknown>;
}

export interface AppendAuditLogInput {
  actorType: string;
  actorId: string;
  tenantId?: string;
  action: string;
  result?: string;
  resourceType: string;
  resourceId: string;
  errorCode?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  requestId?: string;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
}
