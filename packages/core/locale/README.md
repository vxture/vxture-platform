# @vxture/core-locale

Server-side locale resolution and content localization toolkit.

## Installation

```bash
pnpm add @vxture/core-locale
```

## Quick Start

```typescript
import { resolveLocale, localizeContent } from "@vxture/core-locale";

// Resolve locale from request
const locale = resolveLocale(request);

// Localize content
const title = localizeContent({ zh: "专业版", en: "Pro" }, locale);
```

## API

### resolveLocale(request)

Resolves locale from HTTP request.

**Priority order:**

1. Cookie (NEXT_LOCALE)
2. Accept-Language header
3. DEFAULT_LOCALE

**Parameters:**

- `request`: LocaleRequest (framework-agnostic request interface)

**Returns:** Locale

### localizeContent(content, locale)

Retrieves string for corresponding language from multi-language object.

**Fallback strategy:**

1. Returns content[locale]
2. Falls back to content[DEFAULT_LOCALE] if target language doesn't exist
3. Returns empty string if DEFAULT_LOCALE also doesn't exist

**Parameters:**

- `content`: Partial<Record<Locale, string>> (multi-language content object)
- `locale`: Locale (target language)

**Returns:** string

### parseAcceptLanguage(header)

Parses Accept-Language header string, returns language list sorted by q value.

**Parameters:**

- `header`: string (Accept-Language header value)

**Returns:** string[]

### parseCookieValue(cookieHeader, key)

Extracts value for specified key from raw Cookie header string.

**Parameters:**

- `cookieHeader`: string (raw Cookie header)
- `key`: string (cookie key to extract)

**Returns:** string | undefined

### normalizeLocale(raw)

Normalizes various language string formats to platform-supported Locale.

**Supported input formats:**

- 'zh' / 'zh-CN' / 'zh-Hans' / 'zh-TW' → 'zh'
- 'en' / 'en-US' / 'en-GB' → 'en'
- Other unknown languages → undefined

**Parameters:**

- `raw`: string (raw language string)

**Returns:** Locale | undefined

### isSupportedLocale(value)

Type guard to check if a string is a supported Locale.

**Parameters:**

- `value`: string

**Returns:** value is Locale

## Exports

```typescript
// Re-exports from @vxture/shared
export type { Locale } from "@vxture/shared";
export { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@vxture/shared";

// core-locale specific types
export type {
  LocaleRequest,
  ResolveLocaleOptions,
  LocalizationOptions,
} from "./types";

// core-locale utility functions
export { resolveLocale, localizeContent } from "./utils";
export {
  parseAcceptLanguage,
  parseCookieValue,
  normalizeLocale,
  isSupportedLocale,
} from "./utils";
```
