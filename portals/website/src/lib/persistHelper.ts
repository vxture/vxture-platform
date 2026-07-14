/**
 * persistHelper.ts - Zustand Persist 辅助工具
 *
 * 功能：
 * - 统一包装 zustand persist 的类型和 partialize 逻辑
 * - 提供类型安全的 persist 选项创建函数
 * - 提高代码可读性并减少重复的类型转换
 *
 * 用途：
 * - 为各 Store 提供类型安全的 persist 选项
 * - 支持自定义状态序列化和反序列化
 *
 * @file persistHelper.ts
 * @desc Zustand Persist 辅助工具函数
 * @author vxture team
 * @created 2024-10-01
 * @copyright Copyright (c) 2024-2025 vxture
 * @version 1.0.0
 * @dependencies Zustand
 * @tags persist, zustand, helper
 * @example
 *   const persistOptions = makePersistOptions('auth', (state) => ({ token: state.token }));
 */

import type { PersistOptions } from "zustand/middleware";

export function makePersistOptions<TState extends object>(
  name: string,
  pick: (s: TState) => Partial<TState>,
): PersistOptions<TState> {
  return {
    name,
    partialize: pick,
  } as PersistOptions<TState>;
}
