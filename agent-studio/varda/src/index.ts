/**
 * index.ts - @vxture/agent-studio-varda 公共导出入口
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Index
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

// ============================================================================
// 主入口组件（宿主 portal 通过 dynamic import 使用）
// ============================================================================

export { VardaChat } from "./components/VardaChat";
export type { VardaChatProps, VardaInlineMode } from "./components/VardaChat";

// ============================================================================
// 类型（供宿主 portal 类型检查）
// ============================================================================

export type {
  VardaSurface,
  VardaMessage,
  ChatStreamEvent,
} from "./types/varda.types";
