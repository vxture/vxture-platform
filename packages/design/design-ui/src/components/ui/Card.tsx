/**
 * Card.tsx - 卡片（shadcn 惯例）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Display
 *
 * 结构承 shadcn 官方 Card 的六件套。相对上游的定制：
 * - 卡片自身用 `shadow-flat` 而非上游的 `shadow-sm`——视觉高度是 T2 的语义阶梯，
 *   卡片是"贴地"那一档，抬高由使用方按场景加 `shadow-raised`。
 * - 内边距走 `p-lg`、标题层次走 `text-title-sm`，跟随密度与字号三档；
 *   上游的 p-6 / text-2xl 是裸数值，不跟随。
 *
 * 原实现在每一件上都挂了 .vx-card__*，随遗留样式层一并退役。
 */

import * as React from "react";
import { cn } from "../../utils/cn";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card text-foreground shadow-flat",
        className,
      )}
      {...props}
    />
  );
});

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardHeader({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2xs p-lg", className)}
      {...props}
    />
  );
});

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function CardTitle({ className, ...props }, ref) {
  return <h3 ref={ref} className={cn("text-title-sm", className)} {...props} />;
});

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return (
    <p
      ref={ref}
      className={cn("text-body-sm text-muted-foreground", className)}
      {...props}
    />
  );
});

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn("p-lg pt-none", className)} {...props} />;
});

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-sm p-lg pt-none", className)}
      {...props}
    />
  );
});

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardTitle.displayName = "CardTitle";
CardDescription.displayName = "CardDescription";
CardContent.displayName = "CardContent";
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
