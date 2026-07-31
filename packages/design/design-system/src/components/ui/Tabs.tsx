/**
 * tabs.tsx - Tabs 组件
 * @package @vxture/design-system
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Navigation
 */

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../utils/cn";

export interface TabsProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Root
> {}

export interface TabsListProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.List
> {}

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Trigger
> {}

export interface TabsContentProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Content
> {}

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  function TabsList({ className, ...props }, ref) {
    return (
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          "inline-flex h-control-xl items-center justify-center rounded-md bg-accent p-2xs text-muted-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  function TabsTrigger({ className, ...props }, ref) {
    return (
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-md py-xs text-label-md",
            "transition-all duration-fast ease-standard",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-disabled",
            "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-raised",
          ),
          className,
        )}
        {...props}
      />
    );
  },
);

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  function TabsContent({ className, ...props }, ref) {
    return (
      <TabsPrimitive.Content
        ref={ref}
        className={cn(
          "mt-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
        {...props}
      />
    );
  },
);

TabsList.displayName = TabsPrimitive.List.displayName;
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
