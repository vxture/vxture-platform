/**
 * middleware.ts - Next.js Middleware
 * @package @vxture/website
 * @description Middleware for authentication redirect and next-intl locale routing
 * @author AI-Generated
 * @date 2026-03-15
 * @version 1.0
 * @copyright Vxture Team
 * @layer Presentation
 * @category Infrastructure
 */

import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

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

function resolveLocalePrefix(pathname: string): string {
  const [firstSegment] = pathname.split("/").filter(Boolean);

  if (
    firstSegment &&
    routing.locales.includes(firstSegment as (typeof routing.locales)[number])
  ) {
    return `/${firstSegment}`;
  }

  return `/${routing.defaultLocale}`;
}

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const [firstSegment, ...restSegments] = segments;

  if (
    firstSegment &&
    routing.locales.includes(firstSegment as (typeof routing.locales)[number])
  ) {
    return restSegments.length > 0 ? `/${restSegments.join("/")}` : "/";
  }

  return pathname;
}

export function middleware(request: NextRequest) {
  const normalizedPath = stripLocalePrefix(request.nextUrl.pathname);
  const localePrefix = resolveLocalePrefix(request.nextUrl.pathname);
  const isProtectedRoute = normalizedPath.startsWith("/dashboard");
  // OIDC-RP session cookie presence (set by website-bff callback). Cookie
  // presence ≠ valid session; the BFF re-verifies on /api/me. See 16a.
  const hasSession = hasRpSession(request);

  // 认证重定向（在 intl 处理之前）
  // 只保护 dashboard：无 session cookie 时跳转到登录页，携带 next 参数供登录后回跳
  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(
      new URL(
        `${localePrefix}/signin?next=${encodeURIComponent(normalizedPath)}`,
        request.url,
      ),
    );
  }

  // 注意：不在 middleware 层拦截"已登录用户访问登录页"的情况
  // 原因：cookie 存在不代表 session 仍然有效（token 可能已过期）
  // 如需已登录跳转，由客户端 AuthSessionBootstrap + 各页面自行处理

  // 交给 next-intl 处理语言前缀路由
  // 写入 pathname 供 getRequestConfig 按需加载翻译
  const response = intlMiddleware(request);
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    // 匹配所有路由，但排除 API 路由、OIDC-RP 路由(/auth/*)和静态资源。
    // /auth/* 是认证流本身（prod 经 nginx 反代到 website-bff），不可被门卫拦截。
    "/((?!api|auth|_next|.*\\..*).*)",
    // 匹配没有语言前缀的路由，以便重定向到默认语言
    "/",
    "/signin",
    "/login",
    "/signup",
    "/register",
    "/products",
    "/about",
    "/dashboard",
  ],
};
