/**
 * Icon.tsx - 图标组件
 * @package @vxture/design-system
 *
 * 功能：提供统一的图标渲染组件，支持尺寸、粗细、颜色等自定义配置
 *       由 @vxture/design-system 客户端入口提供 "use client" 边界
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Common
 */

import { iconRegistry } from "./iconRegistry";
import type { IconProps, IconSize } from "./icon.types";

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 语义化尺寸到像素值的映射表
 */
const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * 占位符组件 - 当图标名称不匹配时使用
 */
const Placeholder = ({
  size = 16,
  className = "",
}: {
  readonly size?: number | string;
  readonly className?: string;
}) => (
  <span
    style={{ width: size, height: size, display: "inline-block" }}
    className={className}
  />
);

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 图标组件
 *
 * 提供统一的图标渲染接口，通过名称从图标注册表中获取对应的图标组件
 * 支持尺寸、粗细、颜色等自定义配置
 *
 * @param name - 图标名称（必填）
 * @param size - 图标尺寸，默认 'md'
 * @param weight - 图标粗细，默认 'regular'
 * @param className - 自定义 CSS 类名
 * @param fallback - 降级图标名称
 * @param color - 图标颜色
 * @param rest - 其他透传属性
 * @example
 * ```tsx
 * <Icon name="home" size="lg" />
 * <Icon name="settings" weight="fill" className="text-vx-primary" />
 * ```
 */
export const Icon = ({
  name,
  size = "md",
  weight = "regular",
  className = "",
  fallback,
  color,
  ...rest
}: IconProps) => {
  // 获取对应的图标组件，支持降级
  const Component =
    iconRegistry[name] ??
    (fallback ? iconRegistry[fallback] : undefined) ??
    Placeholder;

  // 解析尺寸值
  const resolvedSize = typeof size === "number" ? size : (sizeMap[size] ?? 20);

  return (
    <Component
      weight={weight}
      size={resolvedSize}
      className={`inline-flex shrink-0 ${className}`}
      aria-hidden
      {...(color !== undefined ? { color } : {})}
      {...rest}
    />
  );
};
