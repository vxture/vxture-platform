"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Icon,
  Avatar,
  Badge,
  Button,
  Input,
  Label,
  NativeSelect,
  Switch,
  Textarea,
  ActionButton,
  PageHeader,
} from "@vxture/design-system";
import { useRouter } from "next/navigation";
import {
  deleteOrgLogo,
  fetchOrganizationProfile,
  orgLogoUrl,
  updateOrganization,
  uploadOrgLogo,
} from "@/api/console-bff";
import type { ConsoleOrganizationProfile } from "@/entities/console";
import { useConsoleSession } from "@/features/session/ConsoleSessionProvider";
import { formatTenantDisplay } from "@/features/tenant/tenant-display";
import { useLocale, useTranslations } from "next-intl";

const LOGO_UPLOAD_MAX_SIZE = 5 * 1024 * 1024;
const CURRENCY_OPTIONS = ["CNY", "USD", "EUR", "GBP", "JPY", "HKD", "SGD"];
const LANGUAGE_OPTIONS = ["zh-CN", "en-US"];

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
    "Europe/London",
    "America/New_York",
  ];
}
const TIMEZONE_OPTIONS = listTimeZones();

type OrgForm = {
  description: string;
  industry: string;
  scale: string;
  website: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
  countryCode: string;
  address: string;
  postalCode: string;
  isBillingRecipient: boolean;
  timezone: string;
  language: string;
  currency: string;
};

function emptyForm(p?: ConsoleOrganizationProfile | null): OrgForm {
  return {
    description: p?.description ?? "",
    industry: p?.industry ?? "",
    scale: p?.scale ?? "",
    website: p?.website ?? "",
    contactName: p?.contactName ?? "",
    contactRole: p?.contactRole ?? "",
    contactEmail: p?.contactEmail ?? "",
    contactPhone: p?.contactPhone ?? "",
    countryCode: p?.countryCode ?? "",
    address: p?.address ?? "",
    postalCode: p?.postalCode ?? "",
    isBillingRecipient: p?.isBillingRecipient ?? false,
    timezone: p?.timezone ?? "",
    language: p?.language ?? "",
    currency: p?.currency ?? "",
  };
}

function trimmed(value: string): string | null {
  return value.trim() || null;
}

function displayValue(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function formatOrganizationDate(
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

function logoStyle(value?: string | null): CSSProperties | undefined {
  return value
    ? { backgroundImage: `url(${JSON.stringify(value)})` }
    : undefined;
}

function organizationInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationPage() {
  const t = useTranslations("organizationPage");
  const locale = useLocale();
  const router = useRouter();
  const { session } = useConsoleSession();
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ConsoleOrganizationProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<OrgForm>(emptyForm());

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchOrganizationProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setErrorKey(data ? null : "feedback.noProfile");
      })
      .catch(() => {
        if (active) setErrorKey("feedback.loadError");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.tenant?.id, session.tenant?.mode]);

  const isPersonal = profile?.tenantType === "personal";

  function openEdit() {
    setForm(emptyForm(profile));
    setEditOpen(true);
    setErrorKey(null);
    setMessageKey(null);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorKey(null);
    try {
      const updated = await updateOrganization({
        description: trimmed(form.description),
        industry: trimmed(form.industry),
        scale: trimmed(form.scale),
        website: trimmed(form.website),
        contactName: trimmed(form.contactName),
        contactRole: trimmed(form.contactRole),
        contactEmail: trimmed(form.contactEmail),
        contactPhone: trimmed(form.contactPhone),
        countryCode: trimmed(form.countryCode),
        address: trimmed(form.address),
        postalCode: trimmed(form.postalCode),
        isBillingRecipient: form.isBillingRecipient,
        timezone: trimmed(form.timezone),
        language: trimmed(form.language),
        currency: trimmed(form.currency),
      });
      setProfile(updated);
      setEditOpen(false);
      setMessageKey("feedback.saved");
    } catch {
      setErrorKey("feedback.saveError");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorKey("feedback.logoFileTypeError");
      return;
    }
    if (file.size > LOGO_UPLOAD_MAX_SIZE) {
      setErrorKey("feedback.logoFileSizeError");
      return;
    }
    setSubmitting(true);
    setErrorKey(null);
    try {
      await uploadOrgLogo(file);
      const refreshed = await fetchOrganizationProfile();
      setProfile(refreshed);
      setMessageKey("feedback.logoSaved");
    } catch {
      setErrorKey("feedback.logoUploadError");
    } finally {
      setSubmitting(false);
    }
  }

  async function clearLogo() {
    setSubmitting(true);
    setErrorKey(null);
    try {
      await deleteOrgLogo();
      const refreshed = await fetchOrganizationProfile();
      setProfile(refreshed);
      setMessageKey("feedback.logoCleared");
    } catch {
      setErrorKey("feedback.logoUploadError");
    } finally {
      setSubmitting(false);
    }
  }

  const empty = t("common.empty");
  const loadingText = t("common.loading");
  const baseTenantName =
    profile?.displayName || profile?.tenantName || session.tenant?.name || "";
  // Outward tenant label = "{name} {type}" (owner rule 2026-07-06).
  const displayName = displayValue(
    formatTenantDisplay(
      baseTenantName,
      profile?.tenantType ?? session.tenant?.tenantType,
    ),
    empty,
  );
  const logoInitials = organizationInitials(baseTenantName || "VX");
  const logoSrc = profile?.logoHash ? orgLogoUrl(profile.logoHash) : null;
  const status = profile ? t(`status.tenant.${profile.status}`) : empty;
  const verifiedStatus = profile?.verifiedStatus
    ? t(`status.verified.${profile.verifiedStatus}`)
    : t("status.verified.unverified");
  const tenantType = profile ? t(`tenantType.${profile.tenantType}`) : empty;
  const createdAt = formatOrganizationDate(profile?.createdAt, locale, empty);
  const updatedAt = formatOrganizationDate(profile?.updatedAt, locale, empty);
  const region =
    [profile?.countryCode, profile?.address].filter(Boolean).join(" / ") ||
    empty;

  function readonlyRow(label: string, value: string) {
    return (
      <div className="vx-profile-row" key={label}>
        <span>{label}</span>
        <strong>{loading ? loadingText : value}</strong>
      </div>
    );
  }

  return (
    <div className="vx-page-stack vx-profile-page vx-account-profile-page vx-organization-profile-page">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      {messageKey ? (
        <p className="vx-profile-message">{t(messageKey)}</p>
      ) : null}
      {errorKey ? <p className="vx-profile-error">{t(errorKey)}</p> : null}

      {/* Logo + tenant identity card */}
      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.foundation.title")}</h2>
            <p>{t("sections.foundation.description")}</p>
          </div>
          {!isPersonal ? (
            <ActionButton
              variant="outline"
              icon="edit"
              onClick={openEdit}
              disabled={!profile || loading || submitting}
            >
              {t("actions.edit")}
            </ActionButton>
          ) : null}
        </div>

        <div className="vx-account-profile-compact-card">
          <Button
            variant="ghost"
            size="icon"
            className="vx-organization-logo-button"
            aria-label={t("logo.edit")}
            title={t("logo.edit")}
            onClick={() => logoFileInputRef.current?.click()}
            disabled={submitting}
          >
            <Avatar
              className={
                logoSrc
                  ? "vx-organization-logo vx-organization-logo--image"
                  : "vx-organization-logo"
              }
              role="img"
              aria-label={t("logo.alt", { name: displayName })}
              style={logoStyle(logoSrc)}
            >
              {!logoSrc ? <strong>{logoInitials}</strong> : null}
            </Avatar>
            <span
              className="vx-account-profile-avatar-button__edit"
              aria-hidden="true"
            >
              <Icon name="edit" size="xs" fallback="placeholder" />
            </span>
          </Button>
          <div className="vx-account-profile-compact-card__info">
            <strong>{loading ? loadingText : displayName}</strong>
            <span>
              {profile?.tenantCode || session.tenant?.tenantCode || empty}
            </span>
          </div>
          <div className="vx-account-profile-compact-card__actions">
            <ActionButton
              icon="plus"
              size="sm"
              onClick={() => logoFileInputRef.current?.click()}
              disabled={submitting}
            >
              {t("actions.uploadLogo")}
            </ActionButton>
            <ActionButton
              variant="outline"
              icon="x"
              size="sm"
              onClick={clearLogo}
              disabled={!logoSrc || submitting}
            >
              {t("actions.clearLogo")}
            </ActionButton>
          </div>
          <Input
            ref={logoFileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => void handleLogoFile(event)}
          />
        </div>

        {readonlyRow(t("fields.tenantCode"), profile?.tenantCode || empty)}
        {readonlyRow(t("fields.tenantType"), tenantType)}
        <div className="vx-profile-row">
          <span>{t("fields.tenantStatus")}</span>
          <strong>
            {loading ? (
              loadingText
            ) : (
              <Badge
                className={`vx-organization-status vx-organization-status--${profile?.status ?? "trial"}`}
              >
                {status}
              </Badge>
            )}
          </strong>
        </div>
        {readonlyRow(t("fields.createdAt"), createdAt)}
        {readonlyRow(
          t("fields.description"),
          displayValue(profile?.description, empty),
        )}
      </section>

      {/* Personal tenant → verification summary + jump (spec §3.4) */}
      {isPersonal ? (
        <section className="vx-profile-group">
          <div className="vx-profile-group__header">
            <div>
              <h2>{t("sections.verification.title")}</h2>
              <p>{t("sections.verification.personalHint")}</p>
            </div>
          </div>
          <div className="vx-profile-row vx-profile-row--actionable">
            <span>{t("fields.verifiedStatus")}</span>
            <strong>{loading ? loadingText : verifiedStatus}</strong>
            <ActionButton
              variant="outline"
              size="sm"
              icon="shield-check"
              onClick={() => router.push("/profile/verification")}
            >
              {t("actions.goVerify")}
            </ActionButton>
          </div>
        </section>
      ) : (
        <>
          {/* Organization → industry / scale / website */}
          <section className="vx-profile-group">
            <div className="vx-profile-group__header">
              <div>
                <h2>{t("sections.business.title")}</h2>
                <p>{t("sections.business.description")}</p>
              </div>
            </div>
            {readonlyRow(
              t("fields.industry"),
              displayValue(profile?.industry, empty),
            )}
            {readonlyRow(
              t("fields.scale"),
              displayValue(profile?.scale, empty),
            )}
            {readonlyRow(
              t("fields.website"),
              displayValue(profile?.website, empty),
            )}
          </section>

          {/* Organization → admin / contact (spec §3.3) */}
          <section className="vx-profile-group">
            <div className="vx-profile-group__header">
              <div>
                <h2>{t("sections.contact.title")}</h2>
                <p>{t("sections.contact.description")}</p>
              </div>
            </div>
            {readonlyRow(
              t("fields.contactName"),
              displayValue(profile?.contactName, empty),
            )}
            {readonlyRow(
              t("fields.contactRole"),
              displayValue(profile?.contactRole, empty),
            )}
            {readonlyRow(
              t("fields.contactEmail"),
              displayValue(profile?.contactEmail, empty),
            )}
            {readonlyRow(
              t("fields.contactPhone"),
              displayValue(profile?.contactPhone, empty),
            )}
            {readonlyRow(t("fields.region"), region)}
            {readonlyRow(
              t("fields.postalCode"),
              displayValue(profile?.postalCode, empty),
            )}
            <div className="vx-profile-row">
              <span>{t("fields.isBillingRecipient")}</span>
              <strong>
                {loading
                  ? loadingText
                  : profile?.isBillingRecipient
                    ? t("common.yes")
                    : t("common.no")}
              </strong>
            </div>
          </section>

          {/* Organization → localization (tenant-level; WS inherits, spec §3.6) */}
          <section className="vx-profile-group">
            <div className="vx-profile-group__header">
              <div>
                <h2>{t("sections.localization.title")}</h2>
                <p>{t("sections.localization.description")}</p>
              </div>
            </div>
            {readonlyRow(
              t("fields.timeZone"),
              displayValue(profile?.timezone, empty),
            )}
            {readonlyRow(
              t("fields.language"),
              displayValue(profile?.language, empty),
            )}
            {readonlyRow(
              t("fields.currency"),
              displayValue(profile?.currency, empty),
            )}
          </section>

          {/* Organization → enterprise verification summary + jump (spec §3.4) */}
          <section className="vx-profile-group">
            <div className="vx-profile-group__header">
              <div>
                <h2>{t("sections.verification.title")}</h2>
                <p>{t("sections.verification.orgHint")}</p>
              </div>
            </div>
            <div className="vx-profile-row vx-profile-row--actionable">
              <span>{t("fields.verifiedStatus")}</span>
              <strong>{loading ? loadingText : verifiedStatus}</strong>
              <ActionButton
                variant="outline"
                size="sm"
                icon="shield-check"
                onClick={() => router.push("/organization/verification")}
              >
                {t("actions.goVerify")}
              </ActionButton>
            </div>
            {readonlyRow(t("fields.updatedAt"), updatedAt)}
          </section>
        </>
      )}

      {/* Edit dialog (organization only) */}
      {editOpen ? (
        <div
          className="vx-profile-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t("dialogs.edit.title")}
        >
          <div
            className="vx-profile-dialog__backdrop"
            onClick={() => setEditOpen(false)}
          />
          <form
            className="vx-profile-dialog__content vx-account-profile-dialog vx-account-profile-dialog--wide"
            onSubmit={submitEdit}
          >
            <header className="vx-account-profile-dialog__header">
              <h3>{t("dialogs.edit.title")}</h3>
              <p>{t("dialogs.edit.description")}</p>
            </header>

            <div className="vx-account-profile-form-grid">
              <Label className="vx-account-profile-form-grid__wide">
                {t("fields.description")}
                <Textarea
                  className="vx-profile-dialog__textarea"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, description: e.target.value }))
                  }
                />
              </Label>
              <Label>
                {t("fields.industry")}
                <Input
                  value={form.industry}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, industry: e.target.value }))
                  }
                />
              </Label>
              <Label>
                {t("fields.scale")}
                <Input
                  value={form.scale}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, scale: e.target.value }))
                  }
                />
              </Label>
              <Label className="vx-account-profile-form-grid__wide">
                {t("fields.website")}
                <Input
                  value={form.website}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, website: e.target.value }))
                  }
                  autoComplete="url"
                />
              </Label>
              <Label>
                {t("fields.contactName")}
                <Input
                  value={form.contactName}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, contactName: e.target.value }))
                  }
                />
              </Label>
              <Label>
                {t("fields.contactRole")}
                <Input
                  value={form.contactRole}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, contactRole: e.target.value }))
                  }
                />
              </Label>
              <Label>
                {t("fields.contactEmail")}
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, contactEmail: e.target.value }))
                  }
                />
              </Label>
              <Label>
                {t("fields.contactPhone")}
                <Input
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, contactPhone: e.target.value }))
                  }
                />
              </Label>
              <Label>
                {t("fields.countryCode")}
                <Input
                  value={form.countryCode}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, countryCode: e.target.value }))
                  }
                />
              </Label>
              <Label>
                {t("fields.postalCode")}
                <Input
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, postalCode: e.target.value }))
                  }
                />
              </Label>
              <Label className="vx-account-profile-form-grid__wide">
                {t("fields.address")}
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, address: e.target.value }))
                  }
                />
              </Label>
              <Label className="vx-account-profile-form-grid__wide vx-organization-checkbox">
                <Switch
                  checked={form.isBillingRecipient}
                  aria-label={t("fields.isBillingRecipient")}
                  onChange={(e) =>
                    setForm((o) => ({
                      ...o,
                      isBillingRecipient: e.target.checked,
                    }))
                  }
                />
                <span>{t("fields.isBillingRecipient")}</span>
              </Label>
              <Label>
                {t("fields.timeZone")}
                <NativeSelect
                  className="vx-input"
                  value={form.timezone}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, timezone: e.target.value }))
                  }
                >
                  <option value="">{t("common.empty")}</option>
                  {form.timezone &&
                  !TIMEZONE_OPTIONS.includes(form.timezone) ? (
                    <option value={form.timezone}>{form.timezone}</option>
                  ) : null}
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </NativeSelect>
              </Label>
              <Label>
                {t("fields.language")}
                <NativeSelect
                  className="vx-input"
                  value={form.language}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, language: e.target.value }))
                  }
                >
                  <option value="">{t("common.empty")}</option>
                  {LANGUAGE_OPTIONS.map((lng) => (
                    <option key={lng} value={lng}>
                      {lng}
                    </option>
                  ))}
                </NativeSelect>
              </Label>
              <Label>
                {t("fields.currency")}
                <NativeSelect
                  className="vx-input"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((o) => ({ ...o, currency: e.target.value }))
                  }
                >
                  <option value="">{t("common.empty")}</option>
                  {CURRENCY_OPTIONS.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </NativeSelect>
              </Label>
            </div>

            <div className="vx-profile-dialog__actions">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={submitting}
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
