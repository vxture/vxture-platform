/**
 * auth.store.ts
 * @package @vxture/website
 * @layer Presentation
 * @category Stores
 *
 * 功能：
 * - 统一管理所有认证相关全局状态，便于集中维护
 * - 提供登录、登出等基础功能
 * - 只保存界面渲染所需的用户信息，不存任何 token
 *
 * 用途：
 * - 供 UI 组件消费，实现认证流程与用户信息管理
 * - 结构与 themeStore.ts 保持一致，便于团队协作
 *
 * @file auth.store.ts
 * @desc 认证相关全局状态管理，统一支持登录、登出等基础功能
 * @author AI-Generated
 * @date 2026-03-15
 * @version 1.0
 * @copyright Vxture Team
 */

import { create } from "zustand";
import axios from "axios";
import type { StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import { makeAuthPersistOptions } from "./persistOptions/authPersist";
import type { AuthState, UserInfo } from "@/types/auth.types";
import { getProfile } from "@/api/auth.api";

function extractResponseMessage(
  message: string | string[] | undefined,
): string | null {
  if (Array.isArray(message)) {
    return message[0] ?? null;
  }
  return message ?? null;
}

function extractAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const upstreamMessage = extractResponseMessage(
      error.response?.data?.message,
    );
    if (upstreamMessage) {
      return upstreamMessage;
    }
    if (error.response?.status === 401) {
      return "登录失败，请检查账号密码";
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "登录失败，请重试";
}

function getUserIdentity(user: UserInfo | null): string {
  return JSON.stringify(user ?? null);
}

const authStoreCreator: StateCreator<AuthState> = (set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user: UserInfo | null) => {
    set({ user, isAuthenticated: !!user });
  },

  restoreSession: async (options = {}) => {
    if (!options.silent) {
      set({ isLoading: true, error: null });
    }

    try {
      const user = await getProfile();
      const current = get();
      if (
        current.isAuthenticated &&
        getUserIdentity(current.user) === getUserIdentity(user)
      ) {
        set({ isLoading: false, error: null });
      } else {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
      return user;
    } catch (error: unknown) {
      const isUnauthorized =
        axios.isAxiosError(error) && error.response?.status === 401;
      if (options.silent && !isUnauthorized) {
        set({ isLoading: false, error: null });
        return get().user;
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error:
          options.silent || isUnauthorized
            ? null
            : extractAuthErrorMessage(error),
      });
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
});

export const useAuthStore = create(
  persist(authStoreCreator, makeAuthPersistOptions()),
);
