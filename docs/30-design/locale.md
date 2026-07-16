# 多语言系统设计

> 更新：2026-05-14

Vxture 使用完整 BCP47 语言标签（`zh-CN` / `en-US`）作为 Locale 标识，统一贯穿 URL 路由、HTML 属性、Intl API 和翻译文件目录。

---

## 核心类型

```typescript
// @vxture/shared/types/locale.types.ts
export type Locale = "zh-CN" | "en-US";

export interface LocaleConfig {
  locale: Locale;
  displayName: string;
  nativeName: string;
  flag?: string;
}
```

```typescript
// @vxture/shared/constants/locale.constants.ts
export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;
export const DEFAULT_LOCALE: Locale = "zh-CN";

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  "zh-CN": {
    locale: "zh-CN",
    displayName: "简体中文",
    nativeName: "简体中文",
    flag: "🇨🇳",
  },
  "en-US": {
    locale: "en-US",
    displayName: "English (US)",
    nativeName: "English (US)",
    flag: "🇺🇸",
  },
};
```

---

## 解析链路

```
URL /zh-CN/page
      │
      ▼
next-intl middleware（extractLocale）
      │
      ▼
@vxture/core-locale  resolveLocale(req)
      │ ── Accept-Language / Cookie fallback
      ▼
Locale = 'zh-CN' | 'en-US'
      │
      ├── html lang={locale}       # 直接使用完整标签，无映射
      ├── next-intl messages/zh-CN/
      └── Intl API（天然兼容）
```

`@vxture/core-locale` 的 `resolveLocale` 函数直接返回完整标签，不做简写转换。

---

## 翻译文件结构

```
messages/
├── zh-CN/
│   ├── common.json
│   └── {page}.json
└── en-US/
    ├── common.json
    └── {page}.json
```

---

## 推荐用法

```typescript
// ✅ 正确：通过 shared 常量使用 Locale
import { Locale, LOCALE_CONFIGS } from "@vxture/shared";

function getLanguageName(locale: Locale): string {
  return LOCALE_CONFIGS[locale].displayName;
}

// ❌ 错误：字符串字面量，绕过类型系统
const locale = "zh";
```

---

## 扩展新语言

1. 在 `@vxture/shared` 中扩展 `Locale` 类型和 `LOCALE_CONFIGS`
2. 在 `@vxture/core-locale` 中更新 `SUPPORTED_LOCALES` 校验
3. 在各 portal 的 `messages/` 目录下添加对应目录和翻译文件
4. 更新 next-intl routing 配置

```typescript
// 示例：新增 ja-JP
export type Locale = "zh-CN" | "en-US" | "ja-JP";
export const SUPPORTED_LOCALES = ["zh-CN", "en-US", "ja-JP"] as const;
```

---

## 跨包约束

| 包                                  | 职责                                                                  |
| ----------------------------------- | --------------------------------------------------------------------- |
| `@vxture/shared`                    | `Locale` 类型、`LOCALE_CONFIGS`、`SUPPORTED_LOCALES` 常量（唯一来源） |
| `@vxture/core-locale`               | 服务端 `resolveLocale`、`localizeContent`                             |
| `portals/website`                   | URL 路由段、HTML lang、next-intl 消费者                               |
| `portals/admin` / `portals/console` | next-intl 消费者，不含 URL 路由逻辑                                   |
