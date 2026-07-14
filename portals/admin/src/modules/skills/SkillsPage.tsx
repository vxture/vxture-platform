"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Icon,
  Input,
  NativeSelect,
  Pagination,
  EmptyState,
} from "@vxture/design-system";
import { fetchSkills } from "@/api/admin-bff";
import type { SkillRecord } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  formatDate,
  formatNumber,
  joinClasses,
} from "@/modules/tenants/tenant-utils";

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type SkillStatusFilter = SkillRecord["status"] | "all";
type ViewMode = "list" | "cards";

const PAGE_SIZE = 20;
const EMPTY_MARK = "-";

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<SkillRecord["status"], string> = {
  active: "已上线",
  disabled: "已停用",
  draft: "草稿",
};

function statusBadgeClass(status: SkillRecord["status"]) {
  if (status === "active") return "vx-admin-role-status-pill--enabled";
  if (status === "draft") return "vx-platform-user-status-pill--pending";
  return "vx-admin-role-status-pill--disabled";
}

function skillSearchText(skill: SkillRecord) {
  return [
    skill.skillCode,
    skill.skillName,
    skill.description,
    skill.category,
    skill.version,
    skill.endpointUrl,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ─── 子组件：汇总卡片 ──────────────────────────────────────────────────────────

function SkillSummary({ skills }: { skills: SkillRecord[] }) {
  const activeCount = skills.filter((s) => s.status === "active").length;
  const disabledCount = skills.filter((s) => s.status === "disabled").length;
  const totalInvocations = skills.reduce((sum, s) => sum + s.invocations, 0);

  return (
    <div className="vx-models-summary">
      <div className="vx-models-summary__item">
        <Icon name="cube" size="md" fallback="placeholder" />
        <span>已上线技能</span>
        <strong>{activeCount}</strong>
      </div>
      <div className="vx-models-summary__item">
        <Icon name="x" size="md" fallback="placeholder" />
        <span>已停用技能</span>
        <strong>{disabledCount}</strong>
      </div>
      <div className="vx-models-summary__item">
        <Icon name="sparkles" size="md" fallback="placeholder" />
        <span>总调用次数</span>
        <strong>{formatNumber(totalInvocations)}</strong>
      </div>
    </div>
  );
}

// ─── 子组件：工具栏 ────────────────────────────────────────────────────────────

function SkillToolbar({
  search,
  statusFilter,
  categoryFilter,
  categories,
  viewMode,
  total,
  onSearchChange,
  onStatusFilterChange,
  onCategoryFilterChange,
  onViewModeChange,
}: {
  search: string;
  statusFilter: SkillStatusFilter;
  categoryFilter: string;
  categories: string[];
  viewMode: ViewMode;
  total: number;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: SkillStatusFilter) => void;
  onCategoryFilterChange: (v: string) => void;
  onViewModeChange: (v: ViewMode) => void;
}) {
  return (
    <div className="vx-models-toolbar">
      <Input
        className="vx-models-toolbar__search"
        type="search"
        placeholder="搜索技能名称、代码、描述…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="vx-models-toolbar__filters">
        <NativeSelect
          className="vx-admin-filter-select"
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as SkillStatusFilter)
          }
        >
          <option value="all">全部状态</option>
          <option value="active">已上线</option>
          <option value="disabled">已停用</option>
          <option value="draft">草稿</option>
        </NativeSelect>
        {categories.length > 0 && (
          <NativeSelect
            className="vx-admin-filter-select"
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
          >
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        )}
        <div className="vx-admin-view-toggle">
          <Button
            variant="ghost"
            size="icon"
            className={joinClasses(
              "vx-admin-view-toggle__btn",
              viewMode === "list" ? "vx-admin-view-toggle__btn--active" : "",
            )}
            onClick={() => onViewModeChange("list")}
            title="列表视图"
          >
            <Icon name="rows" size="sm" fallback="placeholder" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={joinClasses(
              "vx-admin-view-toggle__btn",
              viewMode === "cards" ? "vx-admin-view-toggle__btn--active" : "",
            )}
            onClick={() => onViewModeChange("cards")}
            title="卡片视图"
          >
            <Icon name="squares-four" size="sm" fallback="placeholder" />
          </Button>
        </div>
      </div>
      <div className="vx-models-toolbar__spacer" />
      <span className="vx-models-toolbar__count">{total} 个技能</span>
    </div>
  );
}

// ─── 子组件：列表视图 ──────────────────────────────────────────────────────────

function SkillList({
  skills,
  startIndex,
}: {
  skills: SkillRecord[];
  startIndex: number;
}) {
  return (
    <div
      className="vx-tenant-directory-list vx-skills-directory-list"
      role="region"
      aria-label="技能列表"
    >
      <div className="vx-tenant-directory-list__header">
        <span>序号</span>
        <span>技能</span>
        <span>分类</span>
        <span>版本</span>
        <span>调用端点</span>
        <span>调用次数</span>
        <span>状态</span>
        <span>更新时间</span>
        <span>操作</span>
      </div>
      {skills.map((skill, index) => (
        <div key={skill.id} className="vx-tenant-directory-row vx-skill-row">
          <span className="vx-skill-row__index">{startIndex + index + 1}</span>
          <span className="vx-skill-row__info">
            <span className="vx-skill-row__name">{skill.skillName}</span>
            <span className="vx-skill-row__code">{skill.skillCode}</span>
          </span>
          <span className="vx-skill-row__category">{skill.category}</span>
          <span className="vx-skill-row__version">{skill.version}</span>
          <span
            className="vx-skill-row__endpoint"
            title={skill.endpointUrl ?? EMPTY_MARK}
          >
            {skill.endpointUrl ?? EMPTY_MARK}
          </span>
          <span className="vx-skill-row__invocations">
            {formatNumber(skill.invocations)}
          </span>
          <span className="vx-skill-row__status">
            <Badge className={statusBadgeClass(skill.status)}>
              {STATUS_LABELS[skill.status]}
            </Badge>
            {skill.isSystem && (
              <Badge className="vx-platform-user-status-pill--pending">
                系统
              </Badge>
            )}
          </span>
          <span className="vx-skill-row__updated">
            {formatDate(skill.updatedAt)}
          </span>
          <span className="vx-tenant-actions">
            <Button
              variant="ghost"
              size="icon"
              className="vx-tenant-actions__trigger"
              disabled={skill.isSystem}
              title={
                skill.isSystem ? "系统技能不可修改" : "操作（数据层待接入）"
              }
            >
              <Icon name="more-vertical" size="lg" fallback="placeholder" />
            </Button>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 子组件：卡片视图 ──────────────────────────────────────────────────────────

function SkillCards({ skills }: { skills: SkillRecord[] }) {
  return (
    <div className="vx-skills-cards">
      {skills.map((skill) => (
        <div key={skill.id} className="vx-skill-card">
          <div className="vx-skill-card__header">
            <span className="vx-skill-card__icon">
              <Icon name="cube" size="md" fallback="placeholder" />
            </span>
            <div className="vx-skill-card__badges">
              <Badge className={statusBadgeClass(skill.status)}>
                {STATUS_LABELS[skill.status]}
              </Badge>
              {skill.isSystem && (
                <Badge className="vx-platform-user-status-pill--pending">
                  系统
                </Badge>
              )}
            </div>
          </div>
          <h3 className="vx-skill-card__name">{skill.skillName}</h3>
          <p className="vx-skill-card__code">{skill.skillCode}</p>
          <p className="vx-skill-card__description">{skill.description}</p>
          <div className="vx-skill-card__meta">
            <span>{skill.category}</span>
            <span>v{skill.version}</span>
            <span>{formatNumber(skill.invocations)} 次调用</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function SkillsPage() {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SkillStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSkills()
      .then(setSkills)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => [...new Set(skills.map((s) => s.category))].sort(),
    [skills],
  );

  const filtered = useMemo(() => {
    let result = skills;
    if (statusFilter !== "all")
      result = result.filter((s) => s.status === statusFilter);
    if (categoryFilter)
      result = result.filter((s) => s.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => skillSearchText(s).includes(q));
    }
    return result;
  }, [skills, search, statusFilter, categoryFilter]);

  const pageSkills = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleStatusFilter = (v: SkillStatusFilter) => {
    setStatusFilter(v);
    setPage(1);
  };
  const handleCategoryFilter = (v: string) => {
    setCategoryFilter(v);
    setPage(1);
  };

  return (
    <div className={joinClasses("vx-page-stack", "vx-skills-page")}>
      <PageHeader
        icon="cube"
        title="技能市场"
        description="注册和管理智能体可调用技能，配置上下线、端点和运行状态。"
      />
      <SkillSummary skills={skills} />
      <SkillToolbar
        search={search}
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        viewMode={viewMode}
        total={filtered.length}
        onSearchChange={handleSearch}
        onStatusFilterChange={handleStatusFilter}
        onCategoryFilterChange={handleCategoryFilter}
        onViewModeChange={setViewMode}
      />
      {loading ? (
        <EmptyState title="加载中…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="暂无技能"
          description={
            search || statusFilter !== "all" || categoryFilter
              ? "尝试调整筛选条件"
              : "尚未接入任何 AI 技能，请通过 API 注册技能"
          }
        />
      ) : (
        <>
          {viewMode === "list" ? (
            <SkillList
              skills={pageSkills}
              startIndex={(page - 1) * PAGE_SIZE}
            />
          ) : (
            <SkillCards skills={pageSkills} />
          )}
          {pageCount > 1 ? (
            <Pagination
              className="vx-tenant-pagination"
              page={page}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
