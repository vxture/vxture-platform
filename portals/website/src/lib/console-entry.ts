/**
 * console-entry.ts - Console Portal 跳转工具
 * @package @vxture/website
 * @layer Presentation
 * @category Navigation
 * @author AI-Generated
 * @date 2026-05-06
 */

import { encodePortalContext } from "@vxture/shared";

// =============================================================================
// 环境变量（构建时注入）
// =============================================================================

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

const DEFAULT_CONSOLE_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://console.vxture.com"
    : "http://localhost:3020";

const DEFAULT_WEBSITE_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://vxture.com"
    : "http://localhost:3010";

const CONSOLE_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? DEFAULT_CONSOLE_BASE_URL,
);

const WEBSITE_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_WEBSITE_URL ?? DEFAULT_WEBSITE_BASE_URL,
);

// =============================================================================
// 入口 URL 构建
// =============================================================================

/**
 * 构建跳转到 Console Portal 的完整 URL，携带来源上下文。
 *
 * Console 通过 `decodePortalContext` 解析上下文，渲染顶栏的来源标题和返回按钮。
 * 其他 Portal（如 agent-studio）应创建各自的 entry 函数，复用相同的 `encodePortalContext`。
 *
 * @param locale - 当前语言代码，用于构建正确的返回 URL
 * @returns 带上下文参数的 Console 入口完整 URL
 */
export function buildConsoleEntryUrl(locale: string): string {
  const queryString = encodePortalContext({
    from: "website",
    returnTo: `${WEBSITE_BASE_URL}/${locale}`,
    caller: "Vxture 官网",
    callerLogo: "/images/logo.png",
  });
  return `${CONSOLE_BASE_URL}?${queryString}`;
}

/**
 * 构建直达 Console `/subscribe` 深链（product_320 §4.5）：产品卡片的转化出口，
 * 携带 product/intent[/target_tier] 落到套餐目录下单，并带来源上下文。
 *
 * @param locale - 当前语言代码
 * @param product - 产品 code（如 "arda"）
 * @param intent - 深链意图（subscribe/upgrade/renew…；console 侧容错未知值）
 * @param tier - 可选，预选目标档位
 */
export function buildConsoleSubscribeUrl(
  locale: string,
  product: string,
  intent: string,
  tier?: string,
): string {
  const ctx = encodePortalContext({
    from: "website",
    returnTo: `${WEBSITE_BASE_URL}/${locale}`,
    caller: "Vxture 官网",
    callerLogo: "/images/logo.png",
  });
  const params = new URLSearchParams({ product, intent });
  if (tier) params.set("target_tier", tier);
  return `${CONSOLE_BASE_URL}/${locale}/subscribe?${params.toString()}&${ctx}`;
}

/**
 * 构建直达 Console「个人信息」页面的 URL，携带与入口相同的来源上下文，
 * 供网站用户菜单在新标签页打开。
 *
 * @param locale - 当前语言代码
 * @returns Console profile 页面完整 URL
 */
export function buildConsoleProfileUrl(locale: string): string {
  const queryString = encodePortalContext({
    from: "website",
    returnTo: `${WEBSITE_BASE_URL}/${locale}`,
    caller: "Vxture 官网",
    callerLogo: "/images/logo.png",
  });
  return `${CONSOLE_BASE_URL}/${locale}/profile?${queryString}`;
}
