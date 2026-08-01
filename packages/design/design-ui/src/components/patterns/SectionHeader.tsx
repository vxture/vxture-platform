/**
 * SectionHeader.tsx - 二级及以下的标题区。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 层级由 `level` 给出，同时决定语义元素与排版角色，两者不会各说各话：
 *
 *   level 1 → <h1> + heading-2   一级
 *   level 2 → <h2> + heading-3   板块标题
 *   level 3 → <h3> + heading-4   板块内的分组
 *   level 4 → <h4> + heading-5   分组内的小节
 *
 * **四档全开，包括 level 1。** 本件的职责到"每一档长什么样"为止——排版角色、语义
 * 元素、两者的对应关系。放几个、放在哪属于信息结构，不在这里的题目里。
 *
 * 与 `ViewHeader` 的分工：`ViewHeader` 是 view 顶部那个完整区域（眉标、图标底板、
 * 描述、标题旁附加物、右侧动作区），`SectionHeader` 是纯粹的标题阶梯。要那套完整
 * 结构用前者，只要一行标题用后者。
 *
 * 相对原实现（DetailSectionHeading）的三处收窄：
 * - **`icon` 改为可选**。原来是必填，导致没有合适图标的板块只能硬塞一个。
 * - **增 `description` 与 `action`**，让它能直接充当 `Section` 的头部，两处不再
 *   各写一套标题排版——原先 PageSection 自己渲染 h2，与本件的 h2 样式并不一致。
 * - **删掉 `iconClassName` / `copyClassName` 两个逃生口**，理由同 ViewHeader：
 *   逃生口会把内部 DOM 变成公开契约。
 */

import * as React from "react";
import { Icon } from "../../icons";
import type { IconName, IconSize } from "../../icons";
import { cn } from "../../utils/cn";

export type SectionHeaderLevel = 1 | 2 | 3 | 4;

export interface SectionHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  readonly title: React.ReactNode;
  /** 1–4，同时决定语义元素与排版角色。 */
  readonly level?: SectionHeaderLevel;
  readonly description?: React.ReactNode;
  /** 板块级动作，通常是一个 ghost / outline 按钮。 */
  readonly action?: React.ReactNode;
  readonly icon?: IconName;
  readonly iconSize?: IconSize | number;
  readonly iconFallback?: IconName;
}

const BY_LEVEL = {
  1: { tag: "h1", type: "text-heading-2" },
  2: { tag: "h2", type: "text-heading-3" },
  3: { tag: "h3", type: "text-heading-4" },
  4: { tag: "h4", type: "text-heading-5" },
} as const;

function SectionHeader({
  className,
  title,
  level = 2,
  description,
  action,
  icon,
  iconSize = "md",
  iconFallback = "placeholder",
  ...props
}: SectionHeaderProps) {
  const { tag: Tag, type } = BY_LEVEL[level];

  return (
    <div
      className={cn("flex items-start justify-between gap-md", className)}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-sm">
        {icon ? (
          <span
            className="mt-2xs shrink-0 text-muted-foreground"
            aria-hidden="true"
          >
            <Icon name={icon} size={iconSize} fallback={iconFallback} />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-2xs">
          <Tag className={cn(type, "text-foreground")}>{title}</Tag>
          {description ? (
            <p className="text-body-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-sm">{action}</div>
      ) : null}
    </div>
  );
}

export { SectionHeader };
