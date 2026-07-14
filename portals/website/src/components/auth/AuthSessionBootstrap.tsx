"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/lib/i18n/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { buildRpLoginUrl } from "@/api/auth.api";

const SESSION_RESTORE_THROTTLE_MS = 1500;
const SESSION_SYNC_INTERVAL_MS = 2000;

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
          if (!user && !silentJustFailed) {
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
