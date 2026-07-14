"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Icon,
  NativeSelect,
  Switch,
  ActionButton,
  PageHeader,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { useTranslations } from "next-intl";

type BooleanSettingKey =
  | "inviteApproval"
  | "externalMembers"
  | "mfaRequired"
  | "trustedDeviceReview"
  | "exportApproval"
  | "apiKeyCreation";
type SelectSettingKey = "defaultRole" | "sessionTimeout" | "auditRetention";
type SettingKey = BooleanSettingKey | SelectSettingKey;
type SectionKey = "access" | "security" | "data";

type TenantSettingState = Record<BooleanSettingKey, boolean> &
  Record<SelectSettingKey, string>;

type SettingRow = {
  key: SettingKey;
  icon: IconName;
  type: "switch" | "select";
  options?: string[];
};

type SettingSection = {
  key: SectionKey;
  icon: IconName;
  rows: SettingRow[];
};

const STORAGE_KEY = "vxture.console.tenantSettings.v1";

const DEFAULT_TENANT_SETTINGS: TenantSettingState = {
  inviteApproval: true,
  externalMembers: false,
  defaultRole: "member",
  mfaRequired: false,
  trustedDeviceReview: true,
  sessionTimeout: "24h",
  auditRetention: "180",
  exportApproval: true,
  apiKeyCreation: false,
};

const SETTING_SECTIONS: SettingSection[] = [
  {
    key: "access",
    icon: "users",
    rows: [
      { key: "inviteApproval", icon: "user-switch", type: "switch" },
      { key: "externalMembers", icon: "globe", type: "switch" },
      {
        key: "defaultRole",
        icon: "shield-check",
        type: "select",
        options: ["readonly", "member", "admin"],
      },
    ],
  },
  {
    key: "security",
    icon: "shield-check",
    rows: [
      { key: "mfaRequired", icon: "key", type: "switch" },
      { key: "trustedDeviceReview", icon: "server", type: "switch" },
      {
        key: "sessionTimeout",
        icon: "clock",
        type: "select",
        options: ["8h", "24h", "7d"],
      },
    ],
  },
  {
    key: "data",
    icon: "database",
    rows: [
      {
        key: "auditRetention",
        icon: "clock",
        type: "select",
        options: ["90", "180", "365"],
      },
      { key: "exportApproval", icon: "arrow-down", type: "switch" },
      { key: "apiKeyCreation", icon: "api", type: "switch" },
    ],
  },
];

function readStoredSettings(): TenantSettingState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_TENANT_SETTINGS;
    }

    return {
      ...DEFAULT_TENANT_SETTINGS,
      ...(JSON.parse(stored) as Partial<TenantSettingState>),
    };
  } catch {
    return DEFAULT_TENANT_SETTINGS;
  }
}

export function SettingsPage() {
  const t = useTranslations("settings");
  const [settings, setSettings] = useState<TenantSettingState>(
    DEFAULT_TENANT_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);
  const [messageKey, setMessageKey] = useState<string | null>(null);

  useEffect(() => {
    setSettings(readStoredSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [hydrated, settings]);

  const enabledPolicies = (
    Object.keys(DEFAULT_TENANT_SETTINGS) as SettingKey[]
  ).filter((key) => {
    const value = settings[key];
    return typeof value === "boolean"
      ? value
      : value !== DEFAULT_TENANT_SETTINGS[key];
  }).length;

  function updateBooleanSetting(key: BooleanSettingKey, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessageKey(null);
  }

  function updateSelectSetting(key: SelectSettingKey, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessageKey(null);
  }

  function resetDefaults() {
    setSettings(DEFAULT_TENANT_SETTINGS);
    setMessageKey("feedback.reset");
  }

  function saveSettings() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setMessageKey("feedback.saved");
  }

  function settingStateLabel(row: SettingRow) {
    const value = settings[row.key];
    if (row.type === "switch") {
      return value ? t("states.enabled") : t("states.disabled");
    }

    return t(`options.${row.key}.${value}`);
  }

  return (
    <div className="vx-page-stack vx-tenant-settings-page">
      <div className="vx-tenant-settings-title">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          secondary={<Badge>{t("backend.pending")}</Badge>}
          action={
            <div className="vx-tenant-settings-actions">
              <ActionButton variant="outline" icon="x" onClick={resetDefaults}>
                {t("reset")}
              </ActionButton>
              <ActionButton icon="check" onClick={saveSettings}>
                {t("save")}
              </ActionButton>
            </div>
          }
        />

        {messageKey ? (
          <p className="vx-profile-message">{t(messageKey)}</p>
        ) : null}

        <section
          className="vx-tenant-settings-summary"
          aria-label={t("summary.title")}
        >
          <div className="vx-tenant-settings-summary__item">
            <Icon name="settings" size="xs" fallback="placeholder" />
            <span>{t("summary.scope")}</span>
            <strong>{t("summary.scopeValue")}</strong>
          </div>
          <div className="vx-tenant-settings-summary__item">
            <Icon name="check" size="xs" fallback="placeholder" />
            <span>{t("summary.enabled")}</span>
            <strong>
              {t("summary.enabledValue", { count: enabledPolicies })}
            </strong>
          </div>
          <div className="vx-tenant-settings-summary__item">
            <Icon name="building-library" size="xs" fallback="placeholder" />
            <span>{t("summary.profile")}</span>
            <strong>{t("summary.profileValue")}</strong>
          </div>
        </section>
      </div>

      <div className="vx-tenant-settings-general">
        <header className="vx-tenant-settings-block-header">
          <div>
            <h2>{t("general.title")}</h2>
            <span>
              {t("general.count", { count: SETTING_SECTIONS.length })}
            </span>
          </div>
        </header>

        <main className="vx-tenant-settings-workspace">
          {SETTING_SECTIONS.map((section) => (
            <section key={section.key} className="vx-tenant-settings-section">
              <header className="vx-tenant-settings-section__title">
                <Icon name={section.icon} size="xs" fallback="placeholder" />
                <div>
                  <h2>{t(`sections.${section.key}.title`)}</h2>
                  <span>
                    {t(`sections.${section.key}.count`, {
                      count: section.rows.length,
                    })}
                  </span>
                </div>
              </header>

              <div className="vx-tenant-settings-list">
                <div className="vx-tenant-settings-list__header">
                  <span>{t("table.policy")}</span>
                  <span>{t("table.state")}</span>
                  <span>{t("table.value")}</span>
                </div>

                {section.rows.map((row) => {
                  const stateLabel = settingStateLabel(row);

                  return (
                    <div key={row.key} className="vx-tenant-settings-row">
                      <div className="vx-tenant-settings-row__policy">
                        <span aria-hidden="true">
                          <Icon
                            name={row.icon}
                            size="xs"
                            fallback="placeholder"
                          />
                        </span>
                        <div>
                          <strong>{t(`rows.${row.key}.title`)}</strong>
                          <p>{t(`rows.${row.key}.hint`)}</p>
                        </div>
                      </div>

                      <span
                        className={
                          stateLabel === t("states.disabled")
                            ? "vx-tenant-settings-state"
                            : "vx-tenant-settings-state vx-tenant-settings-state--on"
                        }
                      >
                        {stateLabel}
                      </span>

                      <div className="vx-tenant-settings-control">
                        {row.type === "switch" ? (
                          <Switch
                            checked={Boolean(settings[row.key])}
                            aria-label={t(`rows.${row.key}.title`)}
                            onChange={(event) =>
                              updateBooleanSetting(
                                row.key as BooleanSettingKey,
                                event.target.checked,
                              )
                            }
                          />
                        ) : (
                          <NativeSelect
                            className="vx-input vx-tenant-settings-select"
                            value={String(settings[row.key])}
                            aria-label={t(`rows.${row.key}.title`)}
                            onChange={(event) =>
                              updateSelectSetting(
                                row.key as SelectSettingKey,
                                event.target.value,
                              )
                            }
                          >
                            {row.options?.map((option) => (
                              <option key={option} value={option}>
                                {t(`options.${row.key}.${option}`)}
                              </option>
                            ))}
                          </NativeSelect>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </main>
      </div>

      <div className="vx-tenant-settings-danger">
        <section className="vx-tenant-settings-section vx-tenant-settings-section--danger">
          <header className="vx-tenant-settings-section__title">
            <Icon name="warning" size="xs" fallback="placeholder" />
            <div>
              <h2>{t("danger.title")}</h2>
              <span>{t("danger.count")}</span>
            </div>
          </header>

          <div className="vx-tenant-settings-danger-row">
            <div className="vx-tenant-settings-row__policy">
              <span aria-hidden="true">
                <Icon name="x" size="xs" fallback="placeholder" />
              </span>
              <div>
                <strong>{t("danger.cancelTenant.title")}</strong>
                <p>{t("danger.cancelTenant.confirmHint")}</p>
              </div>
            </div>
            <Badge>{t("danger.confirmRequired")}</Badge>
            <ActionButton variant="outline" icon="x">
              {t("danger.cancelTenant.action")}
            </ActionButton>
          </div>
        </section>
      </div>
    </div>
  );
}
