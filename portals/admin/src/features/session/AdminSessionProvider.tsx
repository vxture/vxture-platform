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
        setStatus("ready");
        if (!snapshot.isAuthenticated && !silentJustFailed) {
          window.location.replace(
            buildRpLoginUrl(window.location.href, { prompt: "none" }),
          );
        }
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
