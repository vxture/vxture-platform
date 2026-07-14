/**
 * layout.tsx - Next.js 根布局（嵌入模式，无宿主 shell）
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category App
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Funnel_Display, Geist_Mono, Inter } from "next/font/google";
import {
  FullscreenProvider,
  ThemeProvider,
  themeBootstrapScript,
} from "@vxture/design-system";
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
  title: "Varda 智能助手",
  description: "Vxture 平台内嵌 AI 助手",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body
        className={`${fontBrand.variable} ${inter.variable} ${geistMono.variable} vx-varda-body`}
      >
        <ThemeProvider defaultMode="system" defaultDensity="default">
          <FullscreenProvider defaultMode="native" defaultLockScroll={false}>
            {children}
          </FullscreenProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
