"use client";

import { useEffect, useState } from "react";
import { Badge, PageHeader, Button } from "@vxture/design-system";
import {
  fetchLoginHistory,
  fetchSessions,
  revokeSession,
} from "@/api/console-bff";
import type { AuthSessionRecord, LoginHistoryEntry } from "@/entities/console";
import { useLocale, useTranslations } from "next-intl";

function parseOS(userAgent: string | null): string {
  if (!userAgent) return "";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Mac OS X/i.test(userAgent)) return "macOS";
  if (/iPhone|iPad/i.test(userAgent)) return "iOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "";
}

function formatDate(value: string, locale: string, fallback: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || fallback;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SecurityPage() {
  const t = useTranslations("securityPage");
  const locale = useLocale();
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [sessions, setSessions] = useState<AuthSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([fetchLoginHistory(), fetchSessions()])
      .then(([rows, sess]) => {
        if (!active) return;
        setHistory(rows);
        setSessions(sess);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleRevoke(sid: string) {
    setRevoking(sid);
    try {
      await revokeSession(sid);
      const next = await fetchSessions();
      setSessions(next);
    } finally {
      setRevoking(null);
    }
  }

  const empty = t("common.empty");

  return (
    <div className="vx-page-stack vx-profile-page vx-account-profile-page">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.loginHistory.title")}</h2>
            <p>{t("sections.loginHistory.description")}</p>
          </div>
        </div>

        {loading ? (
          <p className="vx-profile-message">{t("common.loading")}</p>
        ) : history.length === 0 ? (
          <p className="vx-profile-message">
            {t("sections.loginHistory.empty")}
          </p>
        ) : (
          <div className="vx-login-history-list">
            {history.map((entry, index) => {
              const os = parseOS(entry.userAgent);
              const location = entry.countryCode || empty;
              const success = entry.result === "success";
              return (
                <div
                  key={`${entry.loginAt}-${index}`}
                  className="vx-login-history-row vx-profile-row vx-profile-row--actionable"
                >
                  <span>{formatDate(entry.loginAt, locale, empty)}</span>
                  <strong>
                    {`${entry.ipAddress || empty} · ${location} · ${os || empty}`}
                  </strong>
                  <Badge variant={success ? "secondary" : "destructive"}>
                    {success ? t("status.success") : t("status.failed")}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.sessions.title")}</h2>
            <p>{t("sections.sessions.description")}</p>
          </div>
        </div>

        {loading ? (
          <p className="vx-profile-message">{t("common.loading")}</p>
        ) : sessions.length === 0 ? (
          <p className="vx-profile-message">{t("sections.sessions.empty")}</p>
        ) : (
          <div className="vx-login-history-list">
            {sessions.map((s) => {
              const os = parseOS(s.userAgent) || empty;
              return (
                <div
                  key={s.sid}
                  className="vx-login-history-row vx-profile-row vx-profile-row--actionable"
                >
                  <span>{formatDate(s.lastActiveAt, locale, empty)}</span>
                  <strong>
                    {`${s.ipAddress || empty} · ${os} · ${s.authMethod}`}
                  </strong>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRevoke(s.sid)}
                    disabled={revoking === s.sid}
                  >
                    {t("sections.sessions.revoke")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
