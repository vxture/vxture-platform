"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Icon,
  ActionMenu,
  Badge,
  Button,
  Checkbox,
  DetailDrawer,
  DialogForm,
  Input,
  Label,
  NativeSelect,
  Textarea,
  EmptyState,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import {
  AdminBffError,
  addTicketComment,
  assignTicket,
  changeTicketStatus,
  fetchSupportTicketsStrict,
  fetchTicket,
  fetchTicketComments,
} from "@/api/admin-bff";
import type { TicketStatusInput } from "@/api/admin-bff";
import type {
  SupportTicketRecord,
  TenantOperationTicket,
  TicketCommentRecord,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  formatNumber,
  ticketStatusLabel,
  typeLabel,
} from "@/modules/tenants/tenant-utils";

type TicketStatusFilter = "all" | TenantOperationTicket["status"];
type TicketPriorityFilter = "all" | TenantOperationTicket["priority"];

const priorityLabels: Record<TenantOperationTicket["priority"], string> = {
  p0: "P0 紧急",
  p1: "P1 高",
  p2: "P2 中",
  p3: "P3 低",
};

const ticketStatusInputLabels: Record<TicketStatusInput, string> = {
  open: "待处理",
  pending: "挂起",
  in_progress: "处理中",
  resolved: "已解决",
  closed: "已关闭",
  reopened: "重新打开",
  cancelled: "已取消",
};

const TICKET_STATUS_INPUT_ORDER: TicketStatusInput[] = [
  "open",
  "pending",
  "in_progress",
  "resolved",
  "closed",
  "reopened",
  "cancelled",
];

function ticketEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case "comment":
      return "回复";
    case "assign":
    case "assignment":
      return "指派";
    case "status_change":
    case "status":
      return "状态变更";
    case "created":
      return "创建";
    default:
      return eventType;
  }
}

function ticketEventBodyText(event: TicketCommentRecord): string | null {
  const payload = event.payload ?? {};
  const candidate =
    payload.body ?? payload.note ?? payload.comment ?? payload.message;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }
  if (typeof payload.status === "string") {
    const label =
      ticketStatusInputLabels[payload.status as TicketStatusInput] ??
      payload.status;
    return `→ ${label}`;
  }
  if (typeof payload.assigneeName === "string") {
    return `指派给 ${payload.assigneeName}`;
  }
  return null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function ticketStatusIcon(status: TenantOperationTicket["status"]): IconName {
  if (status === "open") return "clock";
  if (status === "processing") return "settings";
  if (status === "blocked") return "warning";
  return "check";
}

function ticketTone(ticket: TenantOperationTicket) {
  if (ticket.priority === "p0" || ticket.status === "blocked") return "danger";
  if (ticket.priority === "p1" || ticket.status === "open") return "warning";
  if (ticket.status === "closed") return "muted";
  return "normal";
}

function ticketSearchText(ticket: SupportTicketRecord) {
  return [
    ticket.id,
    ticket.title,
    ticket.status,
    ticket.priority,
    ticket.tenantName,
    ticket.tenantCode,
    ticket.region,
    ticket.industry,
    ticket.ownerName,
  ]
    .join(" ")
    .toLowerCase();
}

function SummaryItem({
  icon,
  label,
  value,
  tags,
  tone = "blue",
}: {
  icon: IconName;
  label: string;
  value: string;
  tags: string[];
  tone?: "blue" | "green" | "amber" | "rose";
}) {
  return (
    <article className={`vx-tenant-summary__item vx-tenant-tone--${tone}`}>
      <Icon name={icon} size="lg" fallback="placeholder" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>
          {tags.map((tag) => (
            <em key={tag}>{tag}</em>
          ))}
        </p>
      </div>
    </article>
  );
}

function TicketActionsMenu({
  ticket,
  onOpenDetail,
}: {
  ticket: SupportTicketRecord;
  onOpenDetail: (ticket: SupportTicketRecord) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${ticket.title} 工单操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "detail",
            label: "工单详情",
            icon: <Icon name="chat-circle" size="xs" fallback="placeholder" />,
            onSelect: () => onOpenDetail(ticket),
          },
          {
            id: "tenant",
            label: "查看租户",
            icon: <Icon name="buildings" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(ticket.tenantId)}`),
          },
          {
            id: "ops-todos",
            label: "运营待办",
            icon: <Icon name="table" size="xs" fallback="placeholder" />,
            onSelect: () => router.push("/ops-todos"),
          },
        ]}
      />
    </div>
  );
}

function TicketRow({
  ticket,
  index,
  selected,
  onToggleSelected,
  onOpenDetail,
}: {
  ticket: SupportTicketRecord;
  index: number;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  onOpenDetail: (ticket: SupportTicketRecord) => void;
}) {
  const tone = ticketTone(ticket);
  const router = useRouter();

  return (
    <div
      className={`vx-tenant-directory-row vx-ticket-row vx-ticket-operation-row vx-commercial-row--${tone} ${selected ? "vx-ticket-operation-row--selected" : ""}`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (
          target.closest(
            'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
          )
        )
          return;
        onToggleSelected(!selected);
      }}
    >
      <span className="vx-ticket-operation-row__select">
        <Checkbox
          className="vx-model-select-checkbox"
          checked={selected}
          onCheckedChange={(value) => onToggleSelected(value === true)}
          aria-label={`选择工单 ${ticket.id}`}
        />
      </span>
      <span className="vx-tenant-directory-row__index">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="vx-commercial-row__main">
        <Button
          variant="link"
          className="vx-model-name-button"
          onClick={() =>
            router.push(`/tenants/${encodeURIComponent(ticket.tenantId)}`)
          }
        >
          {ticket.title}
        </Button>
        <small>
          {ticket.id} / {ticket.ownerName}
        </small>
      </span>
      <span className="vx-commercial-row__tenant">
        <Icon
          name={ticket.tenantType === "company" ? "buildings" : "user"}
          size="sm"
          fallback="placeholder"
        />
        <span>
          <strong>{ticket.tenantName}</strong>
          <small>
            {ticket.tenantCode} / {typeLabel(ticket.tenantType)}
          </small>
        </span>
      </span>
      <span className="vx-commercial-status-line">
        <span
          className={`vx-commercial-status-dot vx-commercial-status-dot--${tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "muted" ? "muted" : "normal"}`}
        >
          <Icon
            name={ticketStatusIcon(ticket.status)}
            size="xs"
            fallback="placeholder"
          />
        </span>
        <Badge
          className={`vx-tenant-pill vx-commercial-pill vx-commercial-pill--${tone}`}
        >
          {ticketStatusLabel(ticket.status)}
        </Badge>
      </span>
      <span className="vx-tenant-directory-row__tag-line">
        <Badge
          className={`vx-tenant-pill vx-commercial-pill vx-commercial-pill--${tone}`}
        >
          {priorityLabels[ticket.priority]}
        </Badge>
        <Badge className="vx-tenant-pill vx-commercial-pill vx-commercial-pill--muted">
          {ticket.industry}
        </Badge>
      </span>
      <span>
        <strong>{formatDateTime(ticket.updatedAt)}</strong>
        <small>{ticket.region}</small>
      </span>
      <TicketActionsMenu ticket={ticket} onOpenDetail={onOpenDetail} />
    </div>
  );
}

function TicketAssignDialog({
  ticket,
  onClose,
  onAssigned,
}: {
  ticket: SupportTicketRecord;
  onClose: () => void;
  onAssigned: (updated: SupportTicketRecord) => void;
}) {
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    assigneeId.trim().length > 0 && assigneeName.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmedNote = note.trim();
      const updated = await assignTicket(ticket.id, {
        assigneeId: assigneeId.trim(),
        assigneeName: assigneeName.trim(),
        ...(trimmedNote ? { note: trimmedNote } : {}),
      });
      onAssigned(updated);
    } catch (err) {
      setError(err instanceof AdminBffError ? err.message : "指派失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogForm
      open
      title="指派工单"
      description={
        <>
          工单：<strong>{ticket.title}</strong>
        </>
      }
      submitLabel="确认指派"
      cancelLabel="取消"
      submitting={submitting}
      submitDisabled={!canSubmit}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onSubmit={handleSubmit}
    >
      <Label htmlFor="vx-ticket-assignee-id">受理人 ID</Label>
      <Input
        id="vx-ticket-assignee-id"
        value={assigneeId}
        onChange={(event) => setAssigneeId(event.target.value)}
        placeholder="受理人账号 ID"
        autoFocus
      />
      <Label htmlFor="vx-ticket-assignee-name">受理人名称</Label>
      <Input
        id="vx-ticket-assignee-name"
        value={assigneeName}
        onChange={(event) => setAssigneeName(event.target.value)}
        placeholder="受理人显示名"
      />
      <Label htmlFor="vx-ticket-assign-note">
        备注 <small>（可选）</small>
      </Label>
      <Textarea
        id="vx-ticket-assign-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="指派说明…"
      />
      {error ? <p className="text-sm text-vx-danger">{error}</p> : null}
    </DialogForm>
  );
}

function TicketStatusDialog({
  ticket,
  onClose,
  onChanged,
}: {
  ticket: SupportTicketRecord;
  onClose: () => void;
  onChanged: (updated: SupportTicketRecord) => void;
}) {
  const [status, setStatus] = useState<TicketStatusInput>("in_progress");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const trimmedNote = note.trim();
      const updated = await changeTicketStatus(ticket.id, {
        status,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      });
      onChanged(updated);
    } catch (err) {
      setError(
        err instanceof AdminBffError ? err.message : "状态变更失败，请重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogForm
      open
      title="变更工单状态"
      description={
        <>
          工单：<strong>{ticket.title}</strong>
        </>
      }
      submitLabel="确认变更"
      cancelLabel="取消"
      submitting={submitting}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onSubmit={handleSubmit}
    >
      <Label htmlFor="vx-ticket-status">目标状态</Label>
      <NativeSelect
        id="vx-ticket-status"
        value={status}
        onChange={(event) => setStatus(event.target.value as TicketStatusInput)}
      >
        {TICKET_STATUS_INPUT_ORDER.map((value) => (
          <option key={value} value={value}>
            {ticketStatusInputLabels[value]}
          </option>
        ))}
      </NativeSelect>
      <Label htmlFor="vx-ticket-status-note">
        备注 <small>（可选）</small>
      </Label>
      <Textarea
        id="vx-ticket-status-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="状态变更说明…"
      />
      {error ? <p className="text-sm text-vx-danger">{error}</p> : null}
    </DialogForm>
  );
}

function TicketDetailDrawer({
  ticketId,
  onClose,
  onTicketUpdated,
}: {
  ticketId: string;
  onClose: () => void;
  onTicketUpdated: (updated: SupportTicketRecord) => void;
}) {
  const [detail, setDetail] = useState<SupportTicketRecord | null>(null);
  const [comments, setComments] = useState<TicketCommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const reloadComments = useCallback(async () => {
    const list = await fetchTicketComments(ticketId);
    setComments(list);
  }, [ticketId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchTicket(ticketId), fetchTicketComments(ticketId)])
      .then(([ticket, list]) => {
        if (!cancelled) {
          setDetail(ticket);
          setComments(list);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "工单详情读取失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  function applyUpdated(updated: SupportTicketRecord) {
    setDetail(updated);
    onTicketUpdated(updated);
    void reloadComments();
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = replyBody.trim();
    if (!body) return;
    setReplySubmitting(true);
    setReplyError(null);
    try {
      await addTicketComment(ticketId, body);
      setReplyBody("");
      await reloadComments();
    } catch (err) {
      setReplyError(
        err instanceof AdminBffError ? err.message : "回复失败，请重试",
      );
    } finally {
      setReplySubmitting(false);
    }
  }

  const title = detail ? detail.title : "工单详情";
  const fields = detail
    ? [
        { label: "工单编号", value: detail.id },
        { label: "状态", value: ticketStatusLabel(detail.status) },
        { label: "优先级", value: priorityLabels[detail.priority] },
        { label: "租户", value: `${detail.tenantName} / ${detail.tenantCode}` },
        { label: "负责人", value: detail.ownerName },
        { label: "行业", value: detail.industry },
        { label: "地区", value: detail.region },
        { label: "更新时间", value: formatDateTime(detail.updatedAt) },
      ]
    : undefined;

  return (
    <DetailDrawer
      title={title}
      {...(fields ? { fields } : {})}
      onClose={onClose}
      closeLabel="关闭工单详情"
    >
      {loading ? (
        <EmptyState
          title="正在加载工单详情"
          description="正在读取工单与时间线。"
        />
      ) : error ? (
        <EmptyState title="工单详情读取失败" description={error} />
      ) : detail ? (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignOpen(true)}
            >
              指派
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusOpen(true)}
            >
              改状态
            </Button>
          </div>

          <div className="grid gap-3">
            <strong>处理时间线</strong>
            {comments.length ? (
              <ol className="grid gap-3">
                {comments.map((event) => {
                  const bodyText = ticketEventBodyText(event);
                  return (
                    <li key={event.id} className="grid gap-1">
                      <span>
                        <Badge>{ticketEventTypeLabel(event.eventType)}</Badge>{" "}
                        <strong>{event.actorName}</strong>{" "}
                        <small>{formatDateTime(event.createdAt)}</small>
                      </span>
                      {bodyText ? <p>{bodyText}</p> : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p>
                <small>暂无时间线记录。</small>
              </p>
            )}
          </div>

          <form className="grid gap-2" onSubmit={handleReply}>
            <Label htmlFor="vx-ticket-reply">回复工单</Label>
            <Textarea
              id="vx-ticket-reply"
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              rows={3}
              placeholder="输入回复内容…"
            />
            {replyError ? (
              <p className="text-sm text-vx-danger">{replyError}</p>
            ) : null}
            <div>
              <Button
                type="submit"
                size="sm"
                disabled={replySubmitting || replyBody.trim().length === 0}
              >
                {replySubmitting ? "处理中..." : "回复"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {assignOpen && detail ? (
        <TicketAssignDialog
          ticket={detail}
          onClose={() => setAssignOpen(false)}
          onAssigned={(updated) => {
            applyUpdated(updated);
            setAssignOpen(false);
          }}
        />
      ) : null}
      {statusOpen && detail ? (
        <TicketStatusDialog
          ticket={detail}
          onClose={() => setStatusOpen(false)}
          onChanged={(updated) => {
            applyUpdated(updated);
            setStatusOpen(false);
          }}
        />
      ) : null}
    </DetailDrawer>
  );
}

export function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TicketStatusFilter>("all");
  const [priority, setPriority] = useState<TicketPriorityFilter>("all");
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const [batchStatusOpen, setBatchStatusOpen] = useState(false);
  const [batchStatusValue, setBatchStatusValue] =
    useState<TicketStatusInput>("in_progress");
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setLoadError(null);

    fetchSupportTicketsStrict()
      .then((records) => {
        if (!cancelled) {
          setTickets(records);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setTickets([]);
          setLoadError(
            error instanceof Error ? error.message : "工单数据读取失败",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesQuery =
        !normalizedQuery || ticketSearchText(ticket).includes(normalizedQuery);
      return (
        matchesQuery &&
        (status === "all" || ticket.status === status) &&
        (priority === "all" || ticket.priority === priority)
      );
    });
  }, [priority, query, status, tickets]);

  const openTickets = tickets.filter((ticket) => ticket.status !== "closed");
  const urgentTickets = tickets.filter(
    (ticket) => ticket.priority === "p0" || ticket.priority === "p1",
  );
  const blockedTickets = tickets.filter(
    (ticket) => ticket.status === "blocked",
  );
  const affectedTenants = new Set(openTickets.map((ticket) => ticket.tenantId))
    .size;
  const visibleTicketIds = useMemo(
    () => visibleTickets.map((ticket) => `${ticket.tenantId}-${ticket.id}`),
    [visibleTickets],
  );
  const selectedVisibleTicketCount = visibleTicketIds.filter((id) =>
    selectedTicketIds.has(id),
  ).length;
  const isTicketPageSelected =
    visibleTicketIds.length > 0 &&
    selectedVisibleTicketCount === visibleTicketIds.length;

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setPriority("all");
  }

  function toggleTicketSelection(id: string, checked: boolean) {
    setSelectedTicketIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleTicketPageSelection(checked: boolean) {
    setSelectedTicketIds((current) => {
      const next = new Set(current);
      visibleTicketIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }

  function applyTicketUpdate(updated: SupportTicketRecord) {
    setTickets((current) =>
      current.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
    );
  }

  const selectedTickets = tickets.filter((ticket) =>
    selectedTicketIds.has(`${ticket.tenantId}-${ticket.id}`),
  );

  async function handleBatchStatus() {
    if (!selectedTickets.length) return;
    setBatchSubmitting(true);
    setBatchError(null);

    const results = await Promise.allSettled(
      selectedTickets.map((ticket) =>
        changeTicketStatus(ticket.id, { status: batchStatusValue }),
      ),
    );

    const updatedById = new Map<string, SupportTicketRecord>();
    let failed = 0;
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        updatedById.set(result.value.id, result.value);
      } else {
        failed += 1;
      }
    });

    if (updatedById.size) {
      setTickets((current) =>
        current.map((ticket) => updatedById.get(ticket.id) ?? ticket),
      );
    }

    setBatchSubmitting(false);
    if (failed > 0) {
      setBatchError(`${failed} 个工单更新失败`);
    } else {
      setBatchStatusOpen(false);
      setSelectedTicketIds(new Set());
    }
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-tickets-page">
      <PageHeader
        icon="chat-circle"
        eyebrow="客户服务"
        title="工单中心"
        description="聚合租户侧待处理工单，按优先级、阻塞状态和更新时间推进支持闭环。"
        secondary={<Badge>只读聚合</Badge>}
      />

      <section className="vx-tenant-summary" aria-label="工单统计">
        <SummaryItem
          icon="chat-circle"
          label="未关闭工单"
          value={formatNumber(openTickets.length)}
          tags={[`影响租户 ${formatNumber(affectedTenants)}`]}
          tone={openTickets.length ? "amber" : "green"}
        />
        <SummaryItem
          icon="warning"
          label="P0/P1 工单"
          value={formatNumber(urgentTickets.length)}
          tags={["优先处理"]}
          tone={urgentTickets.length ? "rose" : "green"}
        />
        <SummaryItem
          icon="clock"
          label="阻塞中"
          value={formatNumber(blockedTickets.length)}
          tags={["需要协同"]}
          tone={blockedTickets.length ? "rose" : "green"}
        />
        <SummaryItem
          icon="table"
          label="工单总数"
          value={formatNumber(tickets.length)}
          tags={["来自工单数据库"]}
        />
      </section>

      <section className="vx-tenant-toolbar" aria-label="工单筛选">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索工单、租户、行业、负责人"
          className="vx-tenant-search vx-commercial-search"
          aria-label="搜索工单"
        />
        <div className="vx-tenant-toolbar__spacer" aria-hidden="true" />
        <label aria-label="状态筛选">
          <NativeSelect
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as TicketStatusFilter)
            }
          >
            <option value="all">全部状态</option>
            <option value="open">待处理</option>
            <option value="processing">处理中</option>
            <option value="blocked">搁置</option>
            <option value="closed">完成</option>
          </NativeSelect>
        </label>
        <label aria-label="优先级筛选">
          <NativeSelect
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as TicketPriorityFilter)
            }
          >
            <option value="all">全部优先级</option>
            <option value="p0">P0</option>
            <option value="p1">P1</option>
            <option value="p2">P2</option>
            <option value="p3">P3</option>
          </NativeSelect>
        </label>
        <Button variant="outline" size="sm" onClick={resetFilters}>
          重置
        </Button>
      </section>

      <section
        className="vx-tenant-directory vx-ticket-directory"
        aria-label="工单列表"
      >
        <header className="vx-tenant-directory__header">
          <strong>工单队列</strong>
          <span>{formatNumber(visibleTickets.length)} 条匹配</span>
        </header>
        {selectedTickets.length ? (
          <div className="vx-tenant-toolbar" aria-label="工单批量操作">
            <span>已选 {formatNumber(selectedTickets.length)} 条</span>
            <div className="vx-tenant-toolbar__spacer" aria-hidden="true" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBatchError(null);
                setBatchStatusOpen(true);
              }}
            >
              批量改状态
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTicketIds(new Set())}
            >
              清空选择
            </Button>
          </div>
        ) : null}
        {isLoading ? (
          <div className="vx-service-health-empty">
            <EmptyState
              title="正在加载工单"
              description="正在从工单数据库读取数据。"
            />
          </div>
        ) : loadError ? (
          <div className="vx-service-health-empty">
            <EmptyState title="工单数据读取失败" description={loadError} />
          </div>
        ) : visibleTickets.length ? (
          <div className="vx-tenant-directory-list vx-ticket-directory-list">
            <div className="vx-tenant-directory-list__header">
              <span>
                <Checkbox
                  className="vx-model-select-checkbox"
                  checked={
                    isTicketPageSelected
                      ? true
                      : selectedVisibleTicketCount > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(value) =>
                    toggleTicketPageSelection(value === true)
                  }
                  aria-label="选择当前页工单"
                />
              </span>
              <span>#</span>
              <span>工单</span>
              <span>租户</span>
              <span>状态</span>
              <span>标签</span>
              <span>更新时间</span>
              <span>操作</span>
            </div>
            {visibleTickets.map((ticket, index) => {
              const ticketKey = `${ticket.tenantId}-${ticket.id}`;

              return (
                <TicketRow
                  key={ticketKey}
                  ticket={ticket}
                  index={index}
                  selected={selectedTicketIds.has(ticketKey)}
                  onToggleSelected={(checked) =>
                    toggleTicketSelection(ticketKey, checked)
                  }
                  onOpenDetail={(selectedTicket) =>
                    setDetailTicketId(selectedTicket.id)
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="vx-service-health-empty">
            <EmptyState
              title="没有匹配的工单"
              description="调整筛选条件，或重置后查看全部工单。"
              action={
                <Button variant="outline" onClick={resetFilters}>
                  重置
                </Button>
              }
            />
          </div>
        )}
      </section>

      {detailTicketId ? (
        <TicketDetailDrawer
          ticketId={detailTicketId}
          onClose={() => setDetailTicketId(null)}
          onTicketUpdated={applyTicketUpdate}
        />
      ) : null}

      {batchStatusOpen ? (
        <DialogForm
          open
          title="批量变更工单状态"
          description={`将对已选 ${formatNumber(selectedTickets.length)} 条工单应用新状态。`}
          submitLabel="确认变更"
          cancelLabel="取消"
          submitting={batchSubmitting}
          submitDisabled={selectedTickets.length === 0}
          onOpenChange={(open) => {
            if (!open) setBatchStatusOpen(false);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void handleBatchStatus();
          }}
        >
          <Label htmlFor="vx-ticket-batch-status">目标状态</Label>
          <NativeSelect
            id="vx-ticket-batch-status"
            value={batchStatusValue}
            onChange={(event) =>
              setBatchStatusValue(event.target.value as TicketStatusInput)
            }
          >
            {TICKET_STATUS_INPUT_ORDER.map((value) => (
              <option key={value} value={value}>
                {ticketStatusInputLabels[value]}
              </option>
            ))}
          </NativeSelect>
          {batchError ? (
            <p className="text-sm text-vx-danger">{batchError}</p>
          ) : null}
        </DialogForm>
      ) : null}
    </div>
  );
}
