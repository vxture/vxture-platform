"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Icon,
  Button,
  Input,
  Label,
  NativeSelect,
  UserAvatar,
  ActionButton,
  PageHeader,
} from "@vxture/design-system";
import {
  deleteOrgLogo,
  fetchMySubscriptions,
  fetchMyWorkspaces,
  fetchOrganizationProfile,
  orgLogoUrl,
  updateOrganization,
  uploadOrgLogo,
  type ConsoleSubscription,
} from "@/api/console-bff";
import type {
  ConsoleOrganizationProfile,
  ConsoleWorkspaceItem,
} from "@/entities/console";
import { useConsoleSession } from "@/features/session/ConsoleSessionProvider";
import { formatTenantDisplay } from "@/features/tenant/tenant-display";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

type Feedback = {
  tone: "success" | "error";
  key: string;
} | null;

const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const CURRENCY_OPTIONS = ["CNY", "USD", "EUR", "GBP", "JPY", "HKD", "SGD"];

function displayValue(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

/** Canonical IANA timezone list, with a curated fallback for older runtimes. */
function listTimeZones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    if (typeof supported === "function") return supported("timeZone");
  } catch {
    // fall through to the curated list
  }
  return [
    "UTC",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Asia/Kolkata",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "America/New_York",
    "America/Chicago",
    "America/Los_Angeles",
    "Australia/Sydney",
  ];
}
const TIMEZONE_OPTIONS = listTimeZones();

/** Prefix an IANA zone with its current UTC offset, e.g. "UTC+08:00 Asia/Shanghai". */
function formatTimezone(value: string | null | undefined, fallback: string) {
  const tz = value?.trim();
  if (!tz) return fallback;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const offset = parts
      .find((p) => p.type === "timeZoneName")
      ?.value.replace("GMT", "UTC");
    return offset ? `${offset} ${tz}` : tz;
  } catch {
    return tz;
  }
}

function formatProfileDate(
  value: string | null | undefined,
  locale: string,
  fallback: string,
) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Tenant status → unified annotation-tag class (same system as the profile page). */
function statusTagClass(status: string | null | undefined) {
  if (status === "suspended" || status === "cancelled") {
    return "vx-profile-tag vx-profile-tag--error";
  }
  if (status === "trial") return "vx-profile-tag vx-profile-tag--warning";
  return "vx-profile-tag";
}

function normalizeOptional(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

export function TenantInfoPage() {
  const t = useTranslations("tenantPage");
  const locale = useLocale();
  const { session } = useConsoleSession();
  const router = useRouter();

  const [profile, setProfile] = useState<ConsoleOrganizationProfile | null>(
    null,
  );
  const [workspaces, setWorkspaces] = useState<ConsoleWorkspaceItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<ConsoleSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  // Separate flag for the second fetch (workspaces + subscriptions) so the
  // §四/§五 empty-states don't flash before that round-trip resolves.
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [localeDialogOpen, setLocaleDialogOpen] = useState(false);
  const [localeForm, setLocaleForm] = useState({
    language: "",
    timezone: "",
    currency: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchOrganizationProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        if (!data) setFeedback({ tone: "error", key: "feedback.noProfile" });
      })
      .catch(() => {
        if (active) setFeedback({ tone: "error", key: "feedback.loadError" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return; // wait for the profile fetch to settle first
    if (!profile?.tenantId) {
      setExtrasLoading(false);
      return;
    }
    let active = true;
    setExtrasLoading(true);
    void Promise.all([fetchMyWorkspaces(), fetchMySubscriptions()])
      .then(([ws, subs]) => {
        if (!active) return;
        setWorkspaces(ws);
        setSubscriptions(subs);
      })
      .finally(() => {
        if (active) setExtrasLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loading, profile?.tenantId]);

  function resetFeedback() {
    setFeedback(null);
  }

  function languageLabel(value: string | null | undefined) {
    if (!value) return empty;
    if (value === "zh-CN") return t("language.zhCN");
    if (value === "en-US") return t("language.enUS");
    return value;
  }

  function openLocaleDialog() {
    if (!profile) return;
    setLocaleForm({
      language: profile.language ?? "",
      timezone: profile.timezone ?? "",
      currency: profile.currency ?? "",
    });
    setLocaleDialogOpen(true);
    resetFeedback();
  }

  async function submitLocale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    resetFeedback();
    try {
      const updated = await updateOrganization({
        language: normalizeOptional(localeForm.language),
        timezone: normalizeOptional(localeForm.timezone),
        currency: normalizeOptional(localeForm.currency),
      });
      setProfile(updated);
      setLocaleDialogOpen(false);
      setFeedback({ tone: "success", key: "feedback.localizationSaved" });
    } catch {
      setFeedback({ tone: "error", key: "feedback.localizationSaveError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;
    if (!LOGO_ACCEPT.split(",").includes(file.type)) {
      setFeedback({ tone: "error", key: "feedback.logoFileTypeError" });
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setFeedback({ tone: "error", key: "feedback.logoFileSizeError" });
      return;
    }
    setSubmitting(true);
    resetFeedback();
    try {
      const { logoHash } = await uploadOrgLogo(file);
      setProfile({ ...profile, logoHash });
      setFeedback({ tone: "success", key: "feedback.logoSaved" });
    } catch {
      setFeedback({ tone: "error", key: "feedback.logoUploadError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function removeLogo() {
    if (!profile?.logoHash) return;
    setSubmitting(true);
    resetFeedback();
    try {
      await deleteOrgLogo();
      setProfile({ ...profile, logoHash: null });
      setFeedback({ tone: "success", key: "feedback.logoCleared" });
    } catch {
      setFeedback({ tone: "error", key: "feedback.logoUploadError" });
    } finally {
      setSubmitting(false);
    }
  }

  const empty = t("common.empty");
  const loadingText = t("common.loading");
  // Outward tenant label = "{name} {type}" (owner rule 2026-07-06).
  const tenantName = displayValue(
    formatTenantDisplay(
      profile?.displayName || profile?.tenantName || session.tenant?.name,
      profile?.tenantType ?? session.tenant?.tenantType,
    ),
    empty,
  );
  const tenantCode = displayValue(profile?.tenantCode, empty);
  const statusLabel = (status: string | null | undefined) =>
    status ? t(`status.${status}`) : empty;
  const typeLabel = (type: string | null | undefined) =>
    type ? t(`type.${type}`) : empty;
  const description = displayValue(profile?.description, empty);
  const createdAt = formatProfileDate(profile?.createdAt, locale, empty);
  const language = languageLabel(profile?.language);
  const timezone = formatTimezone(profile?.timezone, empty);
  const currency = displayValue(profile?.currency, empty);
  const logoSrc = profile?.logoHash ? orgLogoUrl(profile.logoHash) : null;
  const tenantWorkspaces = workspaces.filter(
    (ws) => ws.tenantId === profile?.tenantId,
  );

  return (
    <div className="vx-page-stack vx-profile-page vx-account-profile-page">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      {feedback ? (
        <p
          className={
            feedback.tone === "success"
              ? "vx-profile-message"
              : "vx-profile-error"
          }
        >
          {t(feedback.key)}
        </p>
      ) : null}

      <Input
        ref={fileInputRef}
        type="file"
        accept={LOGO_ACCEPT}
        hidden
        onChange={(event) => void handleLogoSelect(event)}
      />

      {/* ── §一 Header card (logo | name + status/type tags | actions) ──────── */}
      <div className="vx-account-profile-compact-card">
        <Button
          variant="ghost"
          size="icon"
          className="vx-account-profile-avatar-button"
          aria-label={t("actions.uploadLogo")}
          title={t("actions.uploadLogo")}
          onClick={() => fileInputRef.current?.click()}
          disabled={!profile || submitting}
        >
          <UserAvatar
            className="vx-account-profile-compact-avatar vx-account-profile-avatar"
            src={logoSrc}
            alt={t("logo.alt", { name: tenantName })}
          />
          <span
            className="vx-account-profile-avatar-button__edit"
            aria-hidden="true"
          >
            <Icon name="edit" size="xs" fallback="placeholder" />
          </span>
        </Button>

        <div className="vx-account-profile-compact-card__info">
          <span className="vx-account-profile-compact-name-row">
            <strong>{loading ? loadingText : tenantName}</strong>
            <span className="vx-account-profile-compact-tags">
              {profile?.status ? (
                <span className={statusTagClass(profile.status)}>
                  {statusLabel(profile.status)}
                </span>
              ) : null}
              {profile?.tenantType ? (
                <span className="vx-profile-tag">
                  {typeLabel(profile.tenantType)}
                </span>
              ) : null}
            </span>
          </span>
          <span className="vx-account-profile-compact-account-no">
            {t("fields.tenantId")}: {loading ? loadingText : tenantCode}
          </span>
        </div>

        <div className="vx-account-profile-compact-card__actions">
          <ActionButton
            variant="outline"
            icon="x"
            size="sm"
            onClick={() => void removeLogo()}
            disabled={submitting || !profile?.logoHash}
          >
            {t("actions.clearLogo")}
          </ActionButton>
        </div>
      </div>

      {/* ── §二 Tenant info (read-only identity rows) ───────────────────────── */}
      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.info.title")}</h2>
            <p>{t("sections.info.description")}</p>
          </div>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.tenantName")}</span>
          <span className="vx-profile-value">
            {loading ? loadingText : tenantName}
          </span>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.tenantId")}</span>
          <span className="vx-profile-value">
            {loading ? loadingText : tenantCode}
          </span>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.tenantType")}</span>
          <span className="vx-profile-value">
            {loading ? loadingText : typeLabel(profile?.tenantType)}
          </span>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.status")}</span>
          <span className="vx-profile-value">
            {loading ? (
              loadingText
            ) : profile?.status ? (
              <span className={statusTagClass(profile.status)}>
                {statusLabel(profile.status)}
              </span>
            ) : (
              empty
            )}
          </span>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.createdAt")}</span>
          <span className="vx-profile-value">
            {loading ? loadingText : createdAt}
          </span>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.description")}</span>
          <span className="vx-profile-value">
            {loading ? loadingText : description}
          </span>
        </div>
      </section>

      {/* ── §三 Localization (the one editable section) ─────────────────────── */}
      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.localization.title")}</h2>
            <p>{t("sections.localization.description")}</p>
          </div>
          <ActionButton
            variant="outline"
            icon="edit"
            onClick={openLocaleDialog}
            disabled={!profile}
          >
            {t("actions.edit")}
          </ActionButton>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.language")}</span>
          <span className="vx-profile-value">
            {loading ? loadingText : language}
          </span>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.timezone")}</span>
          <span className="vx-profile-value">
            {loading ? loadingText : timezone}
          </span>
        </div>
        <div className="vx-profile-row">
          <span>{t("fields.currency")}</span>
          <span className="vx-profile-value">
            {loading ? loadingText : currency}
          </span>
        </div>
      </section>

      {/* ── §四 Subscription ────────────────────────────────────────────────── */}
      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.subscription.title")}</h2>
            <p>{t("sections.subscription.description")}</p>
          </div>
        </div>
        {subscriptions.length === 0 ? (
          <p className="vx-profile-message">
            {loading || extrasLoading
              ? loadingText
              : t("sections.subscription.empty")}
          </p>
        ) : (
          <div className="vx-account-connected-list">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="vx-account-connected-row">
                <span
                  className="vx-account-connected-logo vx-account-connected-logo--workspace"
                  aria-hidden="true"
                >
                  <Icon name="sparkles" size="sm" fallback="placeholder" />
                </span>
                <div className="vx-account-connected-copy">
                  <div className="vx-account-connected-copy__title">
                    <strong>{sub.planName}</strong>
                    <span
                      className={
                        sub.isTrial
                          ? "vx-profile-tag vx-profile-tag--warning"
                          : "vx-profile-tag"
                      }
                    >
                      {sub.isTrial
                        ? t("subscription.trial")
                        : t("subscription.active")}
                    </span>
                  </div>
                  <p>{sub.planId}</p>
                </div>
                <div className="vx-account-connected-meta">
                  <span>{t("fields.price")}</span>
                  <span>
                    {sub.price} {sub.currency}
                  </span>
                </div>
                <div className="vx-account-connected-meta">
                  <span>{t("fields.nextBilling")}</span>
                  <span>
                    {formatProfileDate(sub.nextBillingDate, locale, empty)}
                  </span>
                </div>
                <div className="vx-account-connected-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/subscription")}
                  >
                    {t("actions.viewPlans")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── §五 Workspaces (this tenant) ────────────────────────────────────── */}
      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.workspaces.title")}</h2>
            <p>{t("sections.workspaces.description")}</p>
          </div>
        </div>
        {tenantWorkspaces.length === 0 ? (
          <p className="vx-profile-message">
            {loading || extrasLoading
              ? loadingText
              : t("sections.workspaces.empty")}
          </p>
        ) : (
          <div className="vx-account-connected-list">
            {tenantWorkspaces.map((ws) => {
              const roleLabel = ["owner", "manager", "member"].includes(ws.role)
                ? t(`workspaces.role.${ws.role}`)
                : ws.role;
              const joinedAt = formatProfileDate(ws.joinedAt, locale, empty);
              const workspaceName = ws.workspaceName ?? ws.tenantName;
              const workspaceId = ws.workspaceId ?? ws.tenantId;
              const isDefault = ws.tenantType === "personal";
              return (
                <div
                  key={ws.tenantId}
                  className="vx-account-connected-row"
                  title={workspaceName}
                >
                  <span
                    className="vx-account-connected-logo vx-account-connected-logo--workspace"
                    aria-hidden="true"
                  >
                    <Icon name="buildings" size="sm" fallback="placeholder" />
                  </span>
                  <div className="vx-account-connected-copy">
                    <div className="vx-account-connected-copy__title">
                      <strong>{workspaceName}</strong>
                      {isDefault ? (
                        <span className="vx-profile-tag">default</span>
                      ) : null}
                    </div>
                    <p title={workspaceId}>{workspaceId}</p>
                  </div>
                  <div className="vx-account-connected-meta">
                    <span>{t("fields.role")}</span>
                    <span>{roleLabel}</span>
                  </div>
                  <div className="vx-account-connected-meta">
                    <span>{t("fields.joinedAt")}</span>
                    <span>{joinedAt}</span>
                  </div>
                  <div className="vx-account-connected-actions" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Localization edit dialog ────────────────────────────────────────── */}
      {localeDialogOpen ? (
        <div
          className="vx-profile-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t("dialogs.localization.title")}
        >
          <div
            className="vx-profile-dialog__backdrop"
            onClick={() => setLocaleDialogOpen(false)}
          />
          <form
            className="vx-profile-dialog__content vx-account-profile-dialog"
            onSubmit={(event) => void submitLocale(event)}
          >
            <header className="vx-account-profile-dialog__header">
              <h3>{t("dialogs.localization.title")}</h3>
              <p>{t("dialogs.localization.description")}</p>
            </header>
            <Label>
              {t("fields.language")}
              <NativeSelect
                className="vx-input"
                value={localeForm.language}
                onChange={(event) =>
                  setLocaleForm((old) => ({
                    ...old,
                    language: event.target.value,
                  }))
                }
              >
                <option value="">{t("common.empty")}</option>
                <option value="zh-CN">{t("language.zhCN")}</option>
                <option value="en-US">{t("language.enUS")}</option>
              </NativeSelect>
            </Label>
            <Label>
              {t("fields.timezone")}
              <NativeSelect
                className="vx-input"
                value={localeForm.timezone}
                onChange={(event) =>
                  setLocaleForm((old) => ({
                    ...old,
                    timezone: event.target.value,
                  }))
                }
              >
                <option value="">{t("common.empty")}</option>
                {localeForm.timezone &&
                !TIMEZONE_OPTIONS.includes(localeForm.timezone) ? (
                  <option value={localeForm.timezone}>
                    {localeForm.timezone}
                  </option>
                ) : null}
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <Label>
              {t("fields.currency")}
              <NativeSelect
                className="vx-input"
                value={localeForm.currency}
                onChange={(event) =>
                  setLocaleForm((old) => ({
                    ...old,
                    currency: event.target.value,
                  }))
                }
              >
                <option value="">{t("common.empty")}</option>
                {localeForm.currency &&
                !CURRENCY_OPTIONS.includes(localeForm.currency) ? (
                  <option value={localeForm.currency}>
                    {localeForm.currency}
                  </option>
                ) : null}
                {CURRENCY_OPTIONS.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <div className="vx-profile-dialog__actions">
              <Button
                variant="outline"
                onClick={() => setLocaleDialogOpen(false)}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {t("actions.save")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
