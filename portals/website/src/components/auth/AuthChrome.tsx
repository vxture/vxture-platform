"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  AuthChromeFooter,
  AuthChromeHeader,
  useTheme,
} from "@vxture/design-system";
import {
  setGlobalLocalePreference,
  setGlobalThemePreference,
} from "@vxture/platform-browser";
import { HEADER_DATA } from "@/data/layout/header.data";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale, Theme } from "@vxture/shared";

export function AuthHeader() {
  const t = useTranslations("layout.header");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <AuthChromeHeader
      brandHref={HEADER_DATA.logo.href}
      brandLogoSrc={HEADER_DATA.logo.image}
      brandLogoAlt={t(HEADER_DATA.logo.altKey)}
      brandLabel={t(HEADER_DATA.logo.labelKey)}
      currentLocale={locale}
      currentTheme={theme}
      localeButtonLabel={t("language.title")}
      localePanelLabel={t("language.title")}
      lightThemeLabel={t("theme.light")}
      darkThemeLabel={t("theme.dark")}
      onLocaleChange={(nextLocale) => {
        setGlobalLocalePreference(nextLocale);
        router.replace(pathname, { locale: nextLocale });
      }}
      onThemeChange={(nextTheme) => {
        setTheme(nextTheme);
        setGlobalThemePreference(nextTheme as Theme);
      }}
    />
  );
}

export function AuthFooter() {
  const t = useTranslations("layout.footer");

  return (
    <AuthChromeFooter
      copyright={t("copyright.text")}
      links={[
        { href: "/legal/terms", label: t("legal.terms") },
        { href: "/legal/privacy", label: t("legal.privacy") },
        { href: "/legal/cookies", label: t("legal.cookies") },
      ]}
    />
  );
}
