/**
 * SurfaceBadge.tsx - 当前 surface 指示标签
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Component
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { Badge } from "@vxture/design-system";
import type { VardaSurface } from "../types/varda.types";

// ============================================================================
// 常量
// ============================================================================

const LABEL: Record<VardaSurface, string> = {
  admin: "运营后台",
  console: "工作台",
};

// ============================================================================
// 组件
// ============================================================================

interface Props {
  surface: VardaSurface;
}

export function SurfaceBadge({ surface }: Props) {
  return (
    <Badge variant="secondary" className={`vx-varda-surface-badge--${surface}`}>
      {LABEL[surface]}
    </Badge>
  );
}
