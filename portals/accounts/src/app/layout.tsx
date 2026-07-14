/**
 * RootLayout - accounts surface root layout
 * @package @vxture/accounts
 *
 * Lean single-locale shell (no next-intl): fonts + ThemeProvider only. The
 * accounts surface is the neutral identity face (OIDC login + future account
 * center). See docs/design/identity-platform-idp.md.
 */
import type { Metadata } from "next";
import { Funnel_Display, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider, themeBootstrapScript } from "@vxture/design-system";
import "./globals.css";

const fontBrand = Funnel_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--vx-font-loader-brand",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--vx-font-loader-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--vx-font-loader-mono",
});

export const metadata: Metadata = {
  title: "登录 · Vxture",
  description: "Vxture 统一身份登录",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body
        className={`${fontBrand.variable} ${inter.variable} ${geistMono.variable}`}
      >
        <ThemeProvider defaultMode="system" defaultDensity="default">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
