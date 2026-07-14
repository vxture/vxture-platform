/**
 * Next.js 中间件 — i18n 路由 + 服务端认证守卫
 *
 * 职责：
 * 1. 认证守卫（auth guard）：无 session cookie 时服务端 302 到登录页，
 *    消除客户端渲染前的闪屏。
 * 2. i18n 路由：locale 检测与 URL 前缀处理，委托给 next-intl。
 *
 * 注意：cookie 存在 ≠ session 有效（token 可能已过期）。
 * 过期态由 ConsoleShell 客户端二次校验兜底。
 *
 * @package @vxture/console
 * @layer Presentation
 * @category Middleware
 * @author AI-Generated
 * @date 2026-05-05
 */

import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { LOCALE_CONSTANTS } from "@vxture/shared";
import { routing } from "./lib/i18n/routing";

const handleI18n = createMiddleware(routing);

/**
 * RP session cookie names (set by the BFF OIDC-RP callback). Mirrors
 * @vxture/core-oidc-rp RP_SESSION_COOKIE / RP_SESSION_COOKIE_INSECURE; duplicated
 * here because edge middleware cannot import that node-runtime package. Presence
 * is a cheap pre-gate only — the BFF remains the authoritative session verifier.
 */
const RP_SESSION_COOKIES = ["__Host-vx_rp_session", "vx_rp_session"] as const;

function hasRpSession(request: NextRequest): boolean {
  return RP_SESSION_COOKIES.some((name) => request.cookies.has(name));
}

// ─── 路径工具 ──────────────────────────────────────────────────────────────────

/** 从 URL 路径中提取 locale（如 /zh-CN/members → 'zh-CN'），无则返回 null */
function extractLocale(pathname: string): string | null {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  return null;
}

/** 去除 locale 前缀，返回纯业务路径（如 /zh-CN/members → /members） */
function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
    if (pathname === `/${locale}`) {
      return "/";
    }
  }
  return pathname;
}

/** 确定目标 locale：优先 URL 路径 > locale cookie > 默认值 */
function resolveLocale(request: NextRequest, pathname: string): string {
  const fromPath = extractLocale(pathname);
  if (fromPath) return fromPath;

  const fromCookie = request.cookies.get(LOCALE_CONSTANTS.COOKIE_KEY)?.value;
  if (
    fromCookie &&
    (routing.locales as readonly string[]).includes(fromCookie)
  ) {
    return fromCookie;
  }

  return routing.defaultLocale;
}

// ─── 中间件主逻辑 ──────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const localePath = stripLocale(pathname);

  // /signin 是唯一公开路由，其余全部需要认证
  const isPublic = localePath === "/signin";

  if (!isPublic) {
    const hasSession = hasRpSession(request);

    if (!hasSession) {
      const locale = resolveLocale(request, pathname);
      // next 传递去 locale 的路径；SSO 入口必须保留 ctx 查询参数才能完成回跳。
      const next = localePath === "/" ? "/" : `${localePath}${search}`;
      return NextResponse.redirect(
        new URL(
          `/${locale}/signin?next=${encodeURIComponent(next)}`,
          request.url,
        ),
      );
    }
  }

  // 认证通过，交给 next-intl 处理 locale 前缀路由
  return handleI18n(request);
}

export const config = {
  // Exclude api/* and auth/* (OIDC-RP routes proxied to console-bff — in prod via
  // nginx, in dev via the same-origin rewrite shim) from the portal auth-gate;
  // they ARE the auth flow and must not be redirected to /signin.
  matcher: ["/((?!api|auth|_next|.*\\..*).*)"],
};
