/**
 * StatCard.tsx - 概览页的重点指标卡。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 与 `MetricCard` 的分工：`MetricCard` 是列表页顶部那一排常规指标（带图标、
 * 四张一行）；本件是**概览页最上方的重点指标**，靠一层极淡的品牌调底纹与下方的
 * 常规卡片拉开层次——透明模式下不能靠加深底色拉层次（那会破坏"页面只有一层
 * 实色底"），而底纹本身也必须压得住：它是背景，浓了就喧宾夺主。
 *
 * 结构照 admin 平台总览的 `admin-overview-pulse__item` 提炼（"活跃客户 / 订阅收入 /
 * 模型调用 / 平台稳定性"四张），取值逐条对照既有实现：
 *
 *   标签行  0.75rem（= label-sm，与既有实现同值），行内跟一个 `?` 帮助图标
 *   读数行  单行省略，右侧跟小标，两者底对齐
 *   内边距  1.5rem = space-lg      内部间距 1rem = space-md
 *   最小高  6rem  = media-xl       容器间距 2rem = space-xl（由调用方给）
 *   顶缘    2px 语气色条           其余三边 1px 发丝线
 *
 * 读数取 `title-xl` 而不是既有实现的裸 1.5rem：那个值不跟随字号三档，而 title-xl
 * 在默认档是 1.25rem、大字号档才到 1.5rem。默认下比原来小一档，换来的是跟随用户
 * 字号偏好——`MetricCard` 的注释里也把"裸数值不跟随"列为上游的缺点。
 * 本件与 `MetricCard` 的层级差交给渐变底纹表达，不靠把字号顶大。
 *
 * **没有大图标**：四张卡并排时，左侧图标会与读数抢视觉重心，而"这是哪个指标"
 * 由标签本身说清楚了。这也是它与 `MetricCard` 最直观的区别。
 *
 * 刻意不做变体：owner 定（2026-08-05）。要别的形态就用别的件，不在这里加参数。
 */

import * as React from "react";
import { Icon } from "../../../icons";
import { cn } from "../../../utils/cn";
import { Button } from "../../base/form/Button";
import type { StatusBadgeTone } from "../../base/display/StatusBadge";

/**
 * 卡面底纹：上白下蓝，180deg 直上直下。
 *
 * **它是背景不是前景，要的是似有似无。** 两端浓淡由 alpha 决定
 * （`--opacity-veil-top` 0.56 / `--opacity-veil-bottom` 0.36），不是靠把色阶调深——
 * 色阶一深就成了色块，会跟卡里的读数抢注意力。端点色与两个透明度都在 T2：
 * 亮色 white → brand-50，暗色由 token 自己重定向（neutral-800 → brand-950），
 * 组件不必知道主题。
 *
 * 用内联 style 而不是工具类：渐变函数里带逗号与空格，写成 Tailwind arbitrary
 * value 要把空格全换成下划线，读起来不像 CSS 也不像别的什么。
 */
const SURFACE: React.CSSProperties = {
  backgroundImage: [
    "linear-gradient(180deg,",
    "color-mix(in srgb, var(--gradient-card-from) calc(var(--opacity-veil-top) * 100%), transparent),",
    "color-mix(in srgb, var(--gradient-card-to) calc(var(--opacity-veil-bottom) * 100%), transparent))",
  ].join(" "),
};

const TONE_ACCENT: Record<StatusBadgeTone, string> = {
  brand: "border-t-primary",
  success: "border-t-success",
  warning: "border-t-warning",
  danger: "border-t-destructive",
  info: "border-t-info",
  neutral: "border-t-border",
};

export interface StatCardProps {
  readonly label: React.ReactNode;
  readonly value: React.ReactNode;
  /** `?` 图标的说明文字。不给则不出图标。 */
  readonly help?: string;
  /** 读数右侧的小标，通常是一到两个 `StatusBadge`。 */
  readonly tags?: React.ReactNode;
  /** 顶缘色条。缺省 `brand`——概览重点卡默认即品牌调。 */
  readonly tone?: StatusBadgeTone;
  readonly className?: string;
}

function StatCard({
  label,
  value,
  help,
  tags,
  tone = "brand",
  className,
}: StatCardProps) {
  return (
    <article
      style={SURFACE}
      className={cn(
        "flex min-h-media-xl min-w-0 flex-col gap-md rounded-md p-lg",
        "border border-primary/10 dark:border-primary/20",
        "border-t-2",
        TONE_ACCENT[tone],
        className,
      )}
    >
      <span className="flex items-center gap-xs text-label-sm text-muted-foreground">
        {label}
        {help ? (
          <Button variant="ghost" size="icon-sm" aria-label={help} title={help}>
            <Icon name="help" size="xs" aria-hidden="true" />
          </Button>
        ) : null}
      </span>
      {/* 读数与小标底对齐：小标是读数的注脚，顶对齐会让它飘在半空。 */}
      <div className="flex min-w-0 items-end gap-sm">
        <span className="truncate text-title-xl font-bold leading-none text-foreground">
          {value}
        </span>
        {tags ? (
          <span className="flex shrink-0 flex-wrap items-center gap-2xs">
            {tags}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export { StatCard };
