/**
 * 认证状态持久化配置
 * @package @vxture/website
 * @layer Presentation
 * @category Persist Options
 */

import type { PersistOptions } from "zustand/middleware";
import type { AuthState } from "@/types/auth.types";
import { AUTH_CONSTANTS } from "@/constants/auth.constants";

export const makeAuthPersistOptions = (): PersistOptions<AuthState> => ({
  name: AUTH_CONSTANTS.PERSIST_KEY,
  partialize: (state: AuthState) =>
    ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
    }) as unknown as AuthState,
  skipHydration: true,
});
