/**
 * useVardaSurface.ts - 读取宿主注入的 surface 并同步到 store
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Hook
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

"use client";

import { useEffect } from "react";
import { useVardaStore } from "../stores/varda.store";
import type { VardaSurface } from "../types/varda.types";

/**
 * 宿主 portal 通过 prop 传入 surface，此 hook 负责将其写入全局 store。
 * 仅在 VardaChat 根组件调用一次。
 */
export function useVardaSurface(surface: VardaSurface) {
  const setSurface = useVardaStore((s) => s.setSurface);

  useEffect(() => {
    setSurface(surface);
  }, [surface, setSurface]);
}
