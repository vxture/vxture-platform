/**
 * MetricCard.tsx - 单个指标读数。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 读数 20px（title-xl）而非展示体大字——admin KPI 卡的密度（workplan §1）：
 * 指标卡成排出现，36px 的读数会让四张卡各自都在喊。读数不是标题，落在 `<span>` 上。
 *
 * 顶缘色条 2px（border-t-medium）——V3 的原文即"语义色只走顶部 2px 描边"；
 * 4px 那一档是侧栏指示条这类结构件的宽度，放在卡顶像贴了胶带。
 *
 * 相对原实现：`icon` 从 `ReactNode` 收为 `IconName`；裸值换成刻度。
 */

import * as React from "react";
import { Icon, type IconName } from "../../../icons";
import { cn } from "../../../utils/cn";
import { Button } from "../../base/form/Button";
import { Card, CardContent } from "../../base/display/Card";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "../../base/display/StatusBadge";
import { toneEdgeClasses } from "../../tone";

export interface MetricCardProps {
  readonly label: React.ReactNode;
  readonly value: React.ReactNode;
  /**
   * 标签行内 `?` 的说明文字：这个指标怎么算出来的。不给则不出图标。
   *
   * 与 `description` 分工：`description` 是卡面上常驻的一行补充，占版面；口径说明
   * 往往是整句（"按创建时间统计"、"billing.payments, pay_status=paid"），常驻会把
   * 一排指标卡撑成一排段落，所以收进 `?` 里按需展开。
   *
   * 与 `StatCard.help` 同一形状——同一件事不该在两件上有两种待遇
   * （2026-08-05：admin 总览为此自建了 DetailTip，三处卡片各挂一份）。
   */
  readonly help?: string;
  /**
   * 读数旁的一句补充，与 `tags` 同行。**不另起一行**：卡就是两行——标签行与读数行
   * （owner 2026-08-06）。此前它落在页脚，一张只有"—"的卡会被撑出大片空白。
   */
  readonly description?: React.ReactNode;
  readonly icon?: IconName;
  /** 环比、同比一类的变化量，渲染为 StatusBadge。 */
  readonly trend?: React.ReactNode;
  readonly trendTone?: StatusBadgeTone;
  /**
   * 读数旁的补充口径，0..n 条，与读数同行换行排布。
   *
   * 与 `trend` 分开是因为语义不同：`trend` 是这一个读数的变化量（单个、有涨跌
   * 方向、自带 tone）；`tags` 是同一读数的分项或口径说明（"筛选 12"、"运营口径"、
   * "影响租户 3"），彼此并列、没有方向、颜色跟随整卡语气——admin 的既有实现里
   * 它们就是 `.vx-tenant-summary__item em { color: var(--tenant-tone) }`，
   * 跟随而非独立着色（2026-08-05 对照 admin 41 处调用点）。
   */
  readonly tags?: readonly React.ReactNode[];
  /**
   * 整块的语气：染顶缘色条、图标与读数，不染底。
   * 一排指标卡靠色条区分归属——底色染满会盖过读数本身。
   *
   * 默认 `brand` 而非 `neutral`：admin KPI 卡的既有视觉是"默认即品牌蓝"
   * （顶缘 + 读数 + 图标同色），neutral 档整卡发灰，只在刻意去色时才选它
   * （2026-08-03 opera 对照 admin 实测）。
   */
  readonly tone?: StatusBadgeTone;
  /**
   * 两种形态（admin 统计卡的既有分工，2026-08-03）：
   * - `default`：带 icon 的松散款，一行不超过 4 张；
   * - `compact`：无 icon 的紧凑款，一行 4 张以上用它——只收内边距与行距，
   *   读数尺寸不缩（admin 紧凑款读数同为大号），icon 传了也不渲染。
   */
  readonly variant?: "default" | "compact";
  readonly className?: string;
}

function MetricCard({
  label,
  value,
  help,
  description,
  icon,
  trend,
  trendTone = "neutral",
  tags,
  tone = "brand",
  variant = "default",
  className,
}: MetricCardProps) {
  const compact = variant === "compact";

  return (
    <Card
      className={cn(
        "border-t-medium",
        toneEdgeClasses[tone],
        // 竖向节奏在 Card 本体上（py + gap），紧凑款在此收档。
        compact && "py-lg",
        className,
      )}
    >
      <CardContent
        className={cn("flex flex-col", compact ? "gap-xs px-lg" : "gap-md")}
      >
        <div className="flex items-start gap-md">
          {/* 图标在左、不套填充块：右侧的填充图标块会和读数抢视觉重心，
              而一排卡片并列时，左侧对齐的图标本身就是分组线索。 */}
          {icon && !compact ? (
            <Icon
              name={icon}
              size="lg"
              aria-hidden="true"
              className="shrink-0"
            />
          ) : null}
          <div className="flex min-w-0 flex-col gap-xs">
            <span className="flex min-w-0 items-center gap-xs text-label-md text-muted-foreground">
              <span className="truncate">{label}</span>
              {help ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={help}
                  title={help}
                  className="shrink-0"
                >
                  <Icon name="help" size="xs" aria-hidden="true" />
                </Button>
              ) : null}
            </span>
            <div className="flex flex-wrap items-center gap-sm">
              {/* 读数继承整卡语气色（admin 的读数即语气色本体）；neutral 档的
                  继承色是 muted-foreground，读数会跟标签一个灰，退回 foreground。 */}
              <span
                className={cn(
                  "text-title-xl font-bold",
                  tone === "neutral" && "text-foreground",
                )}
              >
                {value}
              </span>
              {trend ? (
                <StatusBadge tone={trendTone}>{trend}</StatusBadge>
              ) : null}
              {/* 标跟随整卡语气：一排卡片里，标的颜色是"属于哪张卡"的线索，
                  各自独立着色会把这条线索打散。 */}
              {tags?.map((tag, index) => (
                <StatusBadge key={index} tone={tone}>
                  {tag}
                </StatusBadge>
              ))}
              {description ? (
                <span className="min-w-0 text-body-sm text-muted-foreground">
                  {description}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { MetricCard };
