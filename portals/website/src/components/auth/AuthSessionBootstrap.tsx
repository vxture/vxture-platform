"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/lib/i18n/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { buildRpLoginUrl } from "@/api/auth.api";

const SESSION_RESTORE_THROTTLE_MS = 1500;
// Background heartbeat only. Foreground focus/visibilitychange already trigger an
// immediate sync when the user returns to the tab, so this interval exists purely
// to catch session expiry while the tab stays focused. Kept at 5 min (was 2 s) to
// avoid every open tab hammering the shared 2C/2G host with a request every 2 s.
const SESSION_SYNC_INTERVAL_MS = 300_000;
// One silent prompt=none SSO attempt per browser tab session. Without this, every
// cold visit / hard refresh by an anonymous marketing visitor triggers a full-page
// IdP round-trip, loading the page twice.
const SSO_ATTEMPT_STORAGE_KEY = "vx_sso_attempted";

function hasAttemptedSilentSso() {
  try {
    return window.sessionStorage.getItem(SSO_ATTEMPT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markSilentSsoAttempted() {
  try {
    window.sessionStorage.setItem(SSO_ATTEMPT_STORAGE_KEY, "1");
  } catch {
    /* sessionStorage unavailable (private mode / blocked) — best effort only */
  }
}

export function AuthSessionBootstrap() {
  const pathname = usePathname();
  const lastRestoreAtRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const isFirstLoad = !bootstrappedRef.current;
    bootstrappedRef.current = true;
    lastRestoreAtRef.current = Date.now();

    if (isFirstLoad) {
      // Detect return from a failed prompt=none silent attempt (signalled by the
      // BFF callback via ?vx_sso_silent=0). Clean the URL immediately so a manual
      // refresh gets a fresh attempt — this fixes the cross-RP session sync case
      // where the user logs in on another app after the first silent attempt failed.
      const params = new URLSearchParams(window.location.search);
      const silentJustFailed = params.get("vx_sso_silent") === "0";
      if (silentJustFailed) {
        params.delete("vx_sso_silent");
        const cleanUrl = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
        window.history.replaceState(null, "", cleanUrl);
      }

      useAuthStore
        .getState()
        .restoreSession({ silent: false })
        .then((user) => {
          if (!user && !silentJustFailed && !hasAttemptedSilentSso()) {
            markSilentSsoAttempted();
            window.location.replace(
              buildRpLoginUrl(window.location.href, { prompt: "none" }),
            );
          }
        });
    } else {
      void useAuthStore.getState().restoreSession({ silent: true });
    }
  }, [pathname]);

  useEffect(() => {
    const restoreIfStale = () => {
      const now = Date.now();
      if (
        inFlightRef.current ||
        now - lastRestoreAtRef.current < SESSION_RESTORE_THROTTLE_MS
      ) {
        return;
      }

      lastRestoreAtRef.current = now;
      inFlightRef.current = true;
      void useAuthStore
        .getState()
        .restoreSession({ silent: true })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        restoreIfStale();
      }
    };

    const intervalId = window.setInterval(
      restoreIfStale,
      SESSION_SYNC_INTERVAL_MS,
    );
    window.addEventListener("focus", restoreIfStale);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", restoreIfStale);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
