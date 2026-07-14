/**
 * 翻译按需加载工具
 * @package @vxture/website
 * @layer Presentation
 * @category I18n
 * @author AI-Generated
 * @date 2026-03-17
 */

import { getMessages } from "next-intl/server";

// ─── 类型 ────────────────────────────────────────────────────────────────────

/** 翻译消息树（next-intl 接受的格式） */
type Messages = Record<string, unknown>;

// ─── 内部工具 ─────────────────────────────────────────────────────────────────

/**
 * 将扁平点号键对象转换为嵌套对象
 * 例：{ "a.b.c": 1 } → { a: { b: { c: 1 } } }
 * 若键本身已是嵌套对象则直接透传（兼容已迁移文件）
 */
function expandDotKeys(flat: Record<string, unknown>): Messages {
  const result: Messages = {};
  for (const [key, value] of Object.entries(flat)) {
    // 值为对象说明该文件已是嵌套结构，直接合并
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = value;
      continue;
    }
    const parts = key.split(".");
    let cursor = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue;
      if (typeof cursor[part] !== "object" || cursor[part] === null) {
        cursor[part] = {};
      }
      cursor = cursor[part] as Record<string, unknown>;
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      cursor[lastPart] = value;
    }
  }
  return result;
}

// ─── 公共 API ─────────────────────────────────────────────────────────────────

/**
 * 按需加载页面翻译
 * @param locale 语言
 * @param page 页面名称（对应 messages/{locale}/{page}.json）
 */
export async function loadPageTranslations(
  locale: string,
  page: string,
): Promise<Messages> {
  const baseMessages = await getMessages({ locale });
  const raw = (await import(`@/../messages/${locale}/${page}.json`))
    .default as Record<string, unknown>;
  return { ...baseMessages, ...expandDotKeys(raw) };
}

/**
 * 按需加载区域翻译
 * @param locale 语言
 * @param section 区域名称
 * @param page 页面名称（可选，有值时路径为 messages/{locale}/{page}/{section}.json）
 */
export async function loadSectionTranslations(
  locale: string,
  section: string,
  page?: string,
): Promise<Messages> {
  const baseMessages = await getMessages({ locale });
  const filePath = page
    ? `@/../messages/${locale}/${page}/${section}.json`
    : `@/../messages/${locale}/${section}.json`;
  const raw = (await import(filePath)).default as Record<string, unknown>;
  return { ...baseMessages, ...expandDotKeys(raw) };
}

/**
 * 加载布局相关翻译
 * 将 header / footer 分别挂载到 layout.header / layout.footer 命名空间
 * @param locale 语言
 */
export async function loadLayoutTranslations(
  locale: string,
): Promise<Messages> {
  const baseMessages = await getMessages({ locale });
  const commonRaw = (await import(`@/../messages/${locale}/common.json`))
    .default as Record<string, unknown>;
  const headerRaw = (await import(`@/../messages/${locale}/layout/header.json`))
    .default as Record<string, unknown>;
  const footerRaw = (await import(`@/../messages/${locale}/layout/footer.json`))
    .default as Record<string, unknown>;

  return {
    ...baseMessages,
    ...expandDotKeys(commonRaw),
    layout: {
      header: expandDotKeys(headerRaw),
      footer: expandDotKeys(footerRaw),
    },
  };
}

/**
 * 加载认证相关翻译
 * @param locale 语言
 */
export async function loadAuthTranslations(locale: string): Promise<Messages> {
  const baseMessages = await getMessages({ locale });
  const raw = (await import(`@/../messages/${locale}/auth.json`))
    .default as Record<string, unknown>;
  return { ...baseMessages, ...expandDotKeys(raw) };
}
