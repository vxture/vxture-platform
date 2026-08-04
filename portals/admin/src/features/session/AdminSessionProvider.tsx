"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { buildRpLoginUrl, logout, restoreSession } from "@/api/admin-bff";
import type { SessionSnapshot } from "@/entities/console";

type SessionStatus = "idle" | "loading" | "ready";

const EMPTY_SESSION: SessionSnapshot = {
  isAuthenticated: false,
  user: null,
  capabilities: [],
};

interface SessionContextValue {
  session: SessionSnapshot;
  status: SessionStatus;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: EMPTY_SESSION,
  status: "idle",
  signOut: async () => undefined,
  refreshSession: async () => undefined,
});

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionSnapshot>(EMPTY_SESSION);
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams(window.location.search);
    const silentJustFailed = params.get("vx_sso_silent") === "0";
    if (silentJustFailed) {
      params.delete("vx_sso_silent");
      const cleanUrl = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", cleanUrl);
    }

    restoreSession()
      .then((snapshot) => {
        if (!active) return;
        setSession(snapshot);
        if (snapshot.isAuthenticated) {
          setStatus("ready");
          return;
        }
        /* 未登录：**不置 ready**，直接把浏览器送走。
         *
         * 原先这里先 setStatus('ready') 再跳转，于是外壳会拿着"已就绪但未登录"
         * 的状态渲染一帧（骨架/空壳），紧接着整页被替换掉——冷启动要落回门户
         * 两次，这一帧就闪两次。状态停在 loading，加载页一直盖着，直到导航发生。
         *
         * 静默失败过就直接走交互式登录，不再退回 `/login` 中转页：那一跳是一次
         * 完整的页面加载，只为了在屏幕上写一句"正在跳转到登录…"再跳走。
         * BFF 侧还记了一个 5 分钟的备忘 cookie，所以连着刷新也不会重复静默往返。 */
        window.location.replace(
          silentJustFailed
            ? buildRpLoginUrl(window.location.href)
            : buildRpLoginUrl(window.location.href, { prompt: "none" }),
        );
      })
      .catch(() => {
        if (!active) return;
        setSession(EMPTY_SESSION);
        setStatus("ready");
      });

    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    await logout();
    setSession(EMPTY_SESSION);
    setStatus("ready");
  }

  async function refreshSession() {
    setStatus("loading");
    const snapshot = await restoreSession();
    setSession(snapshot);
    setStatus("ready");
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        status,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useAdminSession() {
  return useContext(SessionContext);
}
