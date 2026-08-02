/**
 * ViewHeader.tsx - 页头。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 收录依据：产品扫描中出现频次最高的一件（console 21 / admin 49 / opera 2 处文件），
 * 且 admin 已经拷了一份自己的实现。上游 shadcn 没有对应件。
 *
 * API 相对原实现收窄了两处，依据是产品的真实用法而非设想：
 * - **删掉 5 个 `*ClassName` 逃生口**（copy / icon / titleRow / description / actions）。
 *   产品一处都没用过——用它们的是 admin 自己那份拷贝。逃生口的代价是页头的内部结构
 *   变成公开契约：一旦有人用了，这里的 DOM 就不能再动。零使用即删。
 * - **删掉 `actions` 别名**，只留 `action`。实测 `action=` 19 处、`actions=` 0 处，
 *   两个名字做同一件事只会让第 20 处不知道该用哪个。
 *
 * `secondary` 保留：它放的是标题旁的状态标一类，位置在标题行内，不是右侧动作区。
 *
 * 视觉语法对齐 admin 页头（workplan §1 V6）：
 * - icon 裸色无底块——页头图标是"这一页是什么"的记号，不是入口卡的按钮化色块；
 *   32px 取 DS 图标刻度（admin 的 40 不在刻度上，X3）。
 * - 标题 20px（title-xl）而非展示体 heading——控制台页头是工作界面的路标，
 *   30px 展示体是营销页的排场，放在这里只会把首屏内容往下顶。
 */

import * as React from "react";
import { Icon } from "../../icons";
import type { IconName, IconSize } from "../../icons";
import { cn } from "../../utils/cn";

export interface PageHeaderProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "title"
> {
  readonly eyebrow?: React.ReactNode;
  readonly icon?: IconName;
  readonly iconFallback?: IconName;
  readonly iconSize?: IconSize | number;
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  /** 右侧动作区，通常是一到两个 Button。 */
  readonly action?: React.ReactNode;
  /** 标题行内的附加物，通常是 StatusBadge。 */
  readonly secondary?: React.ReactNode;
}

const ViewHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  function ViewHeader(
    {
      className,
      eyebrow,
      icon,
      iconFallback = "placeholder",
      iconSize = "xl",
      title,
      description,
      action,
      secondary,
      ...props
    },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className={cn("flex flex-wrap items-start gap-xl pb-lg", className)}
        {...props}
      >
        {icon ? (
          <span className="shrink-0 text-primary-text" aria-hidden="true">
            <Icon name={icon} size={iconSize} fallback={iconFallback} />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-sm">
          {eyebrow ? (
            <p className="text-overline text-muted-foreground">{eyebrow}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="text-title-xl text-foreground">{title}</h1>
            {secondary}
          </div>
          {description ? (
            <p className="text-body-md text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-sm">{action}</div>
        ) : null}
      </section>
    );
  },
);

ViewHeader.displayName = "ViewHeader";

export { ViewHeader };
