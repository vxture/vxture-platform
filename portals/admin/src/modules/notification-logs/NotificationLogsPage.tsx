"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  Input,
  NativeSelect,
  Pagination,
  useToast,
} from "@vxture/design-system";
import { fetchNotificationLogs } from "@/api/admin-bff";
import type { NotificationLogRecord } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { joinClasses } from "@/modules/tenants/tenant-utils";

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// P2 占位板块建设：通知投递台账（support.notification_logs，只读）。
// 守卫 notification:log.read（seed §4.3）。回执字段由投递 webhook 回写。

const PAGE_SIZE = 20;

const CHANNEL_LABELS: Record<string, string> = {
  email: "邮件",
  sms: "短信",
  inapp: "站内",
  webhook: "Webhook",
  push: "推送",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "排队中",
  sent: "已发送",
  delivered: "已送达",
  opened: "已打开",
  failed: "失败",
  bounced: "退回",
};

function statusBadgeClass(status: string): string {
  if (status === "delivered" || status === "opened")
    return "vx-admin-role-status-pill--enabled";
  if (status === "failed" || status === "bounced")
    return "vx-platform-user-status-pill--attention";
  if (status === "sent") return "vx-platform-user-status-pill--pending";
  return "vx-admin-role-status-pill--disabled";
}

function describeError(error: unknown): { description?: string } {
  return error instanceof Error && error.message
    ? { description: error.message }
    : {};
}

export function NotificationLogsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<NotificationLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchNotificationLogs()
      .then(setItems)
      .catch((error) =>
        toast({ tone: "error", title: "加载失败", ...describeError(error) }),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (channelFilter !== "all")
      result = result.filter((i) => i.channel === channelFilter);
    if (statusFilter !== "all")
      result = result.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) =>
        [i.recipient, i.templateCode, i.referenceId ?? "", i.tenantName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return result;
  }, [items, search, channelFilter, statusFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  const failedCount = items.filter(
    (i) => i.status === "failed" || i.status === "bounced",
  ).length;

  return (
    <div className={joinClasses("vx-page-stack", "vx-notification-page")}>
      <PageHeader
        icon="bell"
        title="通知记录"
        description="平台通知投递台账（只读）。涵盖邮件、短信、站内、Webhook、推送渠道的发送与回执状态，用于投递排障。"
      />
      <div className="vx-models-summary">
        <div className="vx-models-summary__item">
          <span>投递总数</span>
          <strong>{items.length}</strong>
        </div>
        <div className="vx-models-summary__item">
          <span>失败 / 退回</span>
          <strong>{failedCount}</strong>
        </div>
      </div>
      <div className="vx-models-toolbar">
        <Input
          className="vx-models-toolbar__search"
          type="search"
          placeholder="搜索接收方、模板、业务号、租户…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="vx-models-toolbar__filters">
          <NativeSelect
            className="vx-admin-filter-select"
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">全部渠道</option>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            className="vx-admin-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="vx-models-toolbar__spacer" />
        <span className="vx-models-toolbar__count">{filtered.length} 条</span>
      </div>
      {loading ? (
        <EmptyState title="加载中…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="暂无通知记录"
          description={
            search || channelFilter !== "all" || statusFilter !== "all"
              ? "尝试调整筛选条件"
              : "数据库中没有通知投递记录"
          }
        />
      ) : (
        <>
          <div
            className="vx-tenant-directory-list vx-notification-directory-list"
            role="region"
            aria-label="通知记录列表"
          >
            <div className="vx-tenant-directory-list__header">
              <span>序号</span>
              <span>时间</span>
              <span>渠道</span>
              <span>模板</span>
              <span>接收方</span>
              <span>状态</span>
              <span>租户</span>
            </div>
            {pageItems.map((item, index) => (
              <div
                key={item.id}
                className="vx-tenant-directory-row vx-notification-row"
                title={item.errorMessage ?? undefined}
              >
                <span className="vx-tenant-directory-row__index">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </span>
                <span>{formatDateTime(item.createdAt)}</span>
                <span>{CHANNEL_LABELS[item.channel] ?? item.channel}</span>
                <span className="vx-config-row__key">
                  {item.templateCode}
                  {item.referenceType ? (
                    <small>{item.referenceType}</small>
                  ) : null}
                </span>
                <span className="vx-config-row__value">{item.recipient}</span>
                <span>
                  <Badge className={statusBadgeClass(item.status)}>
                    {STATUS_LABELS[item.status] ?? item.status}
                    {item.retryCount > 0 ? ` ·${item.retryCount}` : ""}
                  </Badge>
                </span>
                <span>{item.tenantName ?? "-"}</span>
              </div>
            ))}
          </div>
          {pageCount > 1 ? (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
