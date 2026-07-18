"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildLogoutUrl,
  buildRpLoginUrl,
  restoreSession,
  switchTenantSession,
} from "@/api/console-bff";
import type { SessionSnapshot } from "@/entities/console";

type SessionStatus = "idle" | "loading" | "ready";
// Background heartbeat only. focus/visibilitychange below already sync immediately
// when the user returns to the tab, so this interval just catches session expiry
// while the tab stays focused. Kept at 5 min (was 2 s): every 2 s each open console
// tab fired 5 HTTP requests (probe + 4 aggregated reads) at the shared 2C/2G host.
const SESSION_SYNC_INTERVAL_MS = 300_000;
const SESSION_SYNC_THROTTLE_MS = 1500;
const ANONYMOUS_SESSION: SessionSnapshot = {
  isAuthenticated: false,
  user: null,
  tenant: null,
  tenantOptions: [],
  capabilities: [],
};

interface RefreshSessionOptions {
  silent?: boolean;
}

interface SessionContextValue {
  session: SessionSnapshot;
  status: SessionStatus;
  signOut: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshSession: (options?: RefreshSessionOptions) => Promise<SessionSnapshot>;
}

const SessionContext = createContext<SessionContextValue>({
  session: ANONYMOUS_SESSION,
  status: "idle",
  signOut: () => undefined,
  switchTenant: async () => undefined,
  refreshSession: async () => ANONYMOUS_SESSION,
});

const ACTIVE_TENANT_STORAGE_KEY = "vx-console-active-tenant-id";

function readStoredTenantId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) ?? undefined;
}

function writeStoredTenantId(tenantId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);
  }
}

async function applyStoredTenant(snapshot: SessionSnapshot) {
  const storedTenantId = readStoredTenantId();
  if (!storedTenantId || snapshot.tenant?.id === storedTenantId) {
    return snapshot;
  }

  const canUseStoredTenant = (snapshot.tenantOptions ?? []).some(
    (tenant) => tenant.id === storedTenantId,
  );
  return canUseStoredTenant ? switchTenantSession(storedTenantId) : snapshot;
}

function getSessionIdentity(snapshot: SessionSnapshot) {
  return JSON.stringify({
    isAuthenticated: snapshot.isAuthenticated,
    user: snapshot.user,
    tenant: snapshot.tenant,
    tenantOptions: snapshot.tenantOptions ?? [],
    capabilities: snapshot.capabilities,
  });
}

export function ConsoleSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionSnapshot>(ANONYMOUS_SESSION);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const sessionRef = useRef<SessionSnapshot>(ANONYMOUS_SESSION);
  const lastSyncAtRef = useRef(0);
  const syncInFlightRef = useRef(false);

  const commitSession = useCallback((snapshot: SessionSnapshot) => {
    const previous = sessionRef.current;
    sessionRef.current = snapshot;

    if (getSessionIdentity(previous) !== getSessionIdentity(snapshot)) {
      setSession(snapshot);
    }
  }, []);

  const refreshSession = useCallback(
    async (options: RefreshSessionOptions = {}) => {
      if (!options.silent) {
        setStatus("loading");
      }

      try {
        const snapshot = await applyStoredTenant(await restoreSession());
        commitSession(snapshot);
        setStatus("ready");

        return snapshot;
      } catch (error) {
        if (!options.silent) {
          commitSession(ANONYMOUS_SESSION);
        }

        setStatus("ready");
        return options.silent ? sessionRef.current : ANONYMOUS_SESSION;
      }
    },
    [commitSession],
  );

  useEffect(() => {
    lastSyncAtRef.current = Date.now();

    const params = new URLSearchParams(window.location.search);
    const silentJustFailed = params.get("vx_sso_silent") === "0";
    if (silentJustFailed) {
      params.delete("vx_sso_silent");
      const cleanUrl = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", cleanUrl);
    }

    refreshSession().then((snapshot) => {
      if (!snapshot.isAuthenticated && !silentJustFailed) {
        window.location.replace(
          buildRpLoginUrl(window.location.href, { prompt: "none" }),
        );
      }
    });
  }, [refreshSession]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const syncIfStale = () => {
      const now = Date.now();
      if (
        syncInFlightRef.current ||
        now - lastSyncAtRef.current < SESSION_SYNC_THROTTLE_MS
      ) {
        return;
      }

      syncInFlightRef.current = true;
      lastSyncAtRef.current = now;

      void refreshSession({ silent: true }).finally(() => {
        syncInFlightRef.current = false;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncIfStale();
      }
    };

    const intervalId = window.setInterval(
      syncIfStale,
      SESSION_SYNC_INTERVAL_MS,
    );
    window.addEventListener("focus", syncIfStale);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncIfStale);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSession, status]);

  const signOut = useCallback(() => {
    // Top-level navigation (not fetch) so the browser sends vx_sid to the IdP
    // end_session, which performs single-logout across all RPs and lands on the
    // unified post-logout page. The page unloads, so no local commit is needed.
    window.location.assign(buildLogoutUrl());
  }, []);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      setStatus("loading");
      const snapshot = await switchTenantSession(tenantId);
      writeStoredTenantId(tenantId);
      commitSession(snapshot);
      setStatus("ready");
    },
    [commitSession],
  );

  // Stable context value: consumers only re-render when session/status actually
  // change, not on every ancestor render.
  const contextValue = useMemo<SessionContextValue>(
    () => ({ session, status, signOut, switchTenant, refreshSession }),
    [session, status, signOut, switchTenant, refreshSession],
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export function useConsoleSession() {
  return useContext(SessionContext);
}
