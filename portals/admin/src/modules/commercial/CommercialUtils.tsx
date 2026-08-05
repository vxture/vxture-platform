import { Badge } from "@vxture/design-system";
import {
  PageSizePicker as SharedPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";

export type { PageSize } from "@/modules/shared/PageSizePicker";
export type ViewMode = "list" | "cards";

export function formatCurrency(
  value: number,
  currency = "CNY",
  maximumFractionDigits = 2,
) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  return <SharedPageSizePicker value={value} onChange={onChange} />;
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
