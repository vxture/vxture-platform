/**
 * page.tsx - Varda 独立开发预览页
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category App
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { VardaChat } from "../components/VardaChat";

/**
 * 仅用于开发调试，生产环境由宿主 portal 通过 dynamic import 嵌入。
 * surface 默认 'admin'，可通过 URL 查询参数切换。
 */
export default function VardaPage() {
  return (
    <div className="vx-varda-preview">
      <VardaChat surface="admin" position="sidebar" />
    </div>
  );
}
