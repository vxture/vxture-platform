"use client";

import { Badge, PageHeader } from "@vxture/design-system";
import { useTranslations } from "next-intl";

/**
 * Shared verification page skeleton (console info spec §1.2 / §3.4, appendix
 * "unified page structure"). Route skeleton only — NO backend, NO tables, NO
 * submit. The four zones are reserved so that adding a third-party verification
 * provider later does not require redesigning the page:
 *   1. top status bar (status badge + timeline; currently "unverified" empty)
 *   2. auth-method select zone (hidden now; reserved for channel cards/tabs)
 *   3. form/detail zone (empty state)
 *   4. history zone (empty state)
 */
export function VerificationSkeleton({
  scope,
}: {
  scope: "personal" | "organization";
}) {
  const t = useTranslations("verificationPage");

  return (
    <div className="vx-page-stack vx-profile-page vx-account-profile-page">
      <PageHeader
        eyebrow={t(`${scope}.eyebrow`)}
        title={t(`${scope}.title`)}
        description={t(`${scope}.description`)}
      />

      {/* 1. Top status bar */}
      <section className="vx-profile-group">
        <div className="vx-profile-row">
          <span>{t("fields.status")}</span>
          <strong>
            <Badge variant="outline">{t("status.unverified")}</Badge>
          </strong>
        </div>
        <p className="vx-profile-message">{t("timeline.empty")}</p>
      </section>

      {/* 2. Auth-method select zone — hidden until third-party channels land */}

      {/* 3. Form / detail zone */}
      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.form.title")}</h2>
            <p>{t("sections.form.description")}</p>
          </div>
        </div>
        <p className="vx-profile-message">{t("sections.form.empty")}</p>
      </section>

      {/* 4. History zone */}
      <section className="vx-profile-group">
        <div className="vx-profile-group__header">
          <div>
            <h2>{t("sections.history.title")}</h2>
            <p>{t("sections.history.description")}</p>
          </div>
        </div>
        <p className="vx-profile-message">{t("sections.history.empty")}</p>
      </section>
    </div>
  );
}
