/**
 * 组件相关类型定义
 * @package @vxture/website
 * @layer Presentation
 * @category Types
 */

export interface SectionInfo {
  readonly id: string;
  readonly name: string;
}

export interface PanelPosition {
  readonly top?: string;
  readonly right?: string;
  readonly bottom?: string;
  readonly left?: string;
  readonly zIndex?: number | string;
}
