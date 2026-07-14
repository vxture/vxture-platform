import { Icon, Badge } from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import {
  PageSizePicker as SharedPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";

export type { PageSize } from "@/modules/shared/PageSizePicker";
export type ViewMode = "list" | "cards";

export function formatCurrency(
  value: number,
  currency = "CNY",
  maximumFractionDigits = 0,
) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function tierTone(tierName: string | null | undefined) {
  const normalized = (tierName ?? "").toLowerCase();
  if (normalized === "free") return "free";
  if (normalized === "pro") return "pro";
  if (normalized === "enterprise") return "enterprise";
  return "other";
}

export function PageSizePicker({
  value,
  onChange,
}: {
  value: PageSize;
  onChange: (value: PageSize) => void;
}) {
  return (
    <SharedPageSizePicker
      value={value}
      onChange={onChange}
      activeVariant="ghost"
      inactiveVariant="ghost"
    />
  );
}

export function SummaryItem({
  icon,
  label,
  value,
  tags,
  tone = "blue",
}: {
  icon: IconName;
  label: string;
  value: string;
  tags?: string[];
  tone?: "blue" | "green" | "amber" | "rose";
}) {
  return (
    <article className={`vx-tenant-summary__item vx-tenant-tone--${tone}`}>
      <Icon name={icon} size="lg" fallback="placeholder" />
      <div>
        <span>{label}</span>
        <p>
          <strong>{value}</strong>
          {tags?.map((tag) => (
            <em key={tag}>{tag}</em>
          ))}
        </p>
      </div>
    </article>
  );
}

export function Tag({
  tone,
  children,
  title,
}: {
  tone: string;
  children: string;
  title?: string;
}) {
  return (
    <Badge
      className={`vx-tenant-pill vx-commercial-pill vx-commercial-pill--${tone}`}
      title={title}
    >
      {children}
    </Badge>
  );
}
