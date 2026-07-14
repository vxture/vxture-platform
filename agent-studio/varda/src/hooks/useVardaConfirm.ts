/**
 * useVardaConfirm.ts - 执行类工具二次确认交互逻辑
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Hook
 *
 * @author AI-Generated
 * @date 2026-05-02
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useVardaStore } from "../stores/varda.store";
import { sendConfirm } from "../lib/varda.client";

// ============================================================================
// 类型
// ============================================================================

export interface ConfirmResult {
  success: boolean;
  cancelled?: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Hook
// ============================================================================

export function useVardaConfirm() {
  const pendingConfirm = useVardaStore((s) => s.pendingConfirm);
  const surface = useVardaStore((s) => s.surface);
  const sessionId = useVardaStore((s) => s.sessionId);
  const setPendingConfirm = useVardaStore((s) => s.setPendingConfirm);

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(
    null,
  );

  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseTimer.current !== null) clearTimeout(autoCloseTimer.current);
    };
  }, []);

  const handleConfirm = useCallback(
    async (confirmed: boolean) => {
      if (!pendingConfirm || !surface) return;
      setIsConfirming(true);
      setConfirmError(null);
      setConfirmResult(null);

      try {
        const raw = await sendConfirm({
          auditId: pendingConfirm.auditId,
          confirmed,
          surface,
          sessionId,
        });

        if (!confirmed) {
          // 取消：直接关闭弹窗
          setPendingConfirm(null);
          return;
        }

        const result = raw as ConfirmResult;
        setConfirmResult(result);

        // 执行成功后短暂展示结果再关闭弹窗，持有 timer ref 以便卸载时清理
        if (result.success !== false) {
          autoCloseTimer.current = setTimeout(() => {
            autoCloseTimer.current = null;
            setPendingConfirm(null);
            setConfirmResult(null);
          }, 2000);
        }
      } catch (err) {
        setConfirmError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsConfirming(false);
      }
    },
    [pendingConfirm, surface, sessionId, setPendingConfirm],
  );

  const dismiss = useCallback(() => {
    if (autoCloseTimer.current !== null) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    setPendingConfirm(null);
    setConfirmError(null);
    setConfirmResult(null);
  }, [setPendingConfirm]);

  return {
    pendingConfirm,
    isConfirming,
    confirmError,
    confirmResult,
    handleConfirm,
    dismiss,
  };
}
