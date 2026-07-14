/**
 * densityConfig.ts - Density 配置
 * @package @vxture/design-system
 *
 * 功能：定义 UI 密度系统的配置
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Configuration
 */

import type { Density } from "./density.types";

// ============================================================================
// 类型
// ============================================================================

type DensitySpaceToken =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl";

type DensityPreset = {
  readonly space: Record<DensitySpaceToken, string>;
  readonly lineHeight: {
    readonly body: string;
    readonly bodyLg: string;
    readonly bodySm: string;
    readonly code: string;
  };
  readonly control: {
    readonly minHeight: string;
    readonly paddingX: string;
    readonly paddingY: string;
  };
  readonly row: {
    readonly minHeight: string;
    readonly paddingY: string;
  };
  readonly layout: {
    readonly toolbarGap: string;
    readonly sectionGap: string;
    readonly cardPadding: string;
    readonly pageGap: string;
  };
};

// ============================================================================
// 配置
// ============================================================================

/**
 * 默认 Density
 */
export const DEFAULT_DENSITY: Density = "default";

/**
 * Density 模式配置
 *
 * 密度控制页面松紧、行距、控件内边距和布局间距。
 * 字号缩放属于独立可读性维度，不在 density 中处理。
 */
export const DENSITY_PRESETS = {
  compact: {
    space: {
      xs: "4px",
      sm: "6px",
      md: "10px",
      lg: "14px",
      xl: "20px",
      "2xl": "28px",
      "3xl": "40px",
      "4xl": "56px",
      "5xl": "80px",
    },
    lineHeight: {
      body: "1.5",
      bodyLg: "1.58",
      bodySm: "1.45",
      code: "1.45",
    },
    control: {
      minHeight: "32px",
      paddingX: "10px",
      paddingY: "6px",
    },
    row: {
      minHeight: "36px",
      paddingY: "8px",
    },
    layout: {
      toolbarGap: "8px",
      sectionGap: "16px",
      cardPadding: "16px",
      pageGap: "20px",
    },
  },
  default: {
    space: {
      xs: "4px",
      sm: "8px",
      md: "12px",
      lg: "16px",
      xl: "24px",
      "2xl": "32px",
      "3xl": "48px",
      "4xl": "64px",
      "5xl": "96px",
    },
    lineHeight: {
      body: "1.6",
      bodyLg: "1.7",
      bodySm: "1.55",
      code: "1.55",
    },
    control: {
      minHeight: "36px",
      paddingX: "12px",
      paddingY: "8px",
    },
    row: {
      minHeight: "44px",
      paddingY: "10px",
    },
    layout: {
      toolbarGap: "12px",
      sectionGap: "24px",
      cardPadding: "20px",
      pageGap: "28px",
    },
  },
  comfortable: {
    space: {
      xs: "6px",
      sm: "10px",
      md: "14px",
      lg: "20px",
      xl: "28px",
      "2xl": "40px",
      "3xl": "56px",
      "4xl": "72px",
      "5xl": "112px",
    },
    lineHeight: {
      body: "1.68",
      bodyLg: "1.78",
      bodySm: "1.62",
      code: "1.62",
    },
    control: {
      minHeight: "42px",
      paddingX: "16px",
      paddingY: "10px",
    },
    row: {
      minHeight: "52px",
      paddingY: "14px",
    },
    layout: {
      toolbarGap: "16px",
      sectionGap: "32px",
      cardPadding: "24px",
      pageGap: "36px",
    },
  },
} as const satisfies Record<Density, DensityPreset>;

/**
 * Density localStorage key
 */
export const DENSITY_STORAGE_KEY = "vx-density";
