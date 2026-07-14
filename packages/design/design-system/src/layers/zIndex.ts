/**
 * zIndex.ts - Z-index 层系统管理
 * @package @vxture/design-system
 *
 * 功能：统一管理应用的层叠顺序，确保 UI 组件层级一致性
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Layers
 */

export const Z_INDEX = {
  dropdown: 1000,
  modal: 1100,
  popover: 1200,
  overlay: 1300,
  fullscreen: 1400,
  toast: 1500,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
export type ZIndexValue = (typeof Z_INDEX)[ZIndexKey];
