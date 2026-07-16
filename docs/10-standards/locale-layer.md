# Vxture 平台 Locale 能力分层规范

## 背景

Vxture 是一个 TypeScript monorepo SaaS 平台。
Locale 能力按职责分布在三个层次，任何 AI 生成的代码必须严格遵守以下分层规则。

---

## 第一层：@vxture/shared

位置：packages/shared/shared/src/

### 语言枚举常量

文件：packages/shared/shared/src/constants/locale.constants.ts

export const SUPPORTED_LOCALES = ['zh', 'en'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: Locale = 'zh';

规则：

- 这是全平台唯一的语言枚举定义
- 所有包（前端、后端、core、service）需要引用语言类型时，
  统一从 @vxture/shared 引入
- 禁止在任何其他包中重复定义 Locale 类型或 SUPPORTED_LOCALES

### 格式化工具函数

文件：packages/shared/shared/src/utils/locale.utils.ts

export function formatCurrency(amount: number, locale: Locale): string
export function formatDate(date: Date, locale: Locale): string
export function formatNumber(number: number, locale: Locale): string

规则：

- 纯函数，无副作用，基于标准 Intl API 实现
- 同时运行于浏览器和 Node.js 环境
- 不依赖任何框架（无 React、无 Next.js、无 NestJS）
- 前端（portals、agent-studio）和后端（bff、services、agent-server）
  都可以直接从 @vxture/shared 引入使用
- 禁止在此文件中引入任何内部包

### 导出

packages/shared/shared/src/index.ts 统一导出：
export _ from './constants/locale.constants';
export _ from './utils/locale.utils';

### 使用示例

// 任意包，前端或后端均可
import { formatCurrency, formatDate, Locale, SUPPORTED_LOCALES } from '@vxture/shared';

---

## 第二层：@vxture/core-locale

位置：packages/core/locale/src/

职责：服务端 locale 解析与内容本地化，框架无关，运行于 Node.js 环境。
依赖：仅依赖 @vxture/shared，不依赖其他任何内部包。

### 能力一：服务端 locale 解析

文件：packages/core/locale/src/utils/locale.utils.ts

export function resolveLocale(request: Request): Locale

实现逻辑（按优先级顺序）：

1. 读取请求 Cookie 中的 NEXT_LOCALE 字段
2. 解析 Accept-Language Header，匹配 SUPPORTED_LOCALES
3. 查询租户级语言配置（如果租户有独立语言设置）
4. 回退到 DEFAULT_LOCALE

规则：

- request 类型为标准 Web API 的 Request，不绑定 NestJS 或 Express 的特定类型
- Locale 类型从 @vxture/shared 引入，不重复定义
- 此函数仅在服务端调用（bff、services、agent-server）
- 禁止在前端代码中调用此函数

### 能力二：服务端内容本地化查找

文件：packages/core/locale/src/utils/locale.utils.ts

export function localizeContent(
content: Record<Locale, string>,
locale: Locale
): string

实现逻辑：

1. 返回 content[locale]
2. 如果目标语言不存在，回退到 content[DEFAULT_LOCALE]
3. 如果 DEFAULT_LOCALE 也不存在，返回空字符串

使用场景：

- BFF 返回多语言内容字段时，按请求语言取值
- Service 层生成账单描述、通知文案等需要本地化的内容

### 导出

packages/core/locale/src/index.ts：
export { resolveLocale, localizeContent } from './utils/locale.utils';
export type { Locale } from '@vxture/shared'; // re-export 便于消费方统一来源

### 使用示例

// bff/_ 或 agent-server/_ 或 services/\* 内部
import { resolveLocale, localizeContent } from '@vxture/core-locale';
import { formatCurrency } from '@vxture/shared';

const locale = resolveLocale(request);

const description = localizeContent(
{ zh: '专业版订阅', en: 'Pro Subscription' },
locale
);

const price = formatCurrency(9900, locale);

---

## 第三层：portals/website（以及其他前端应用）

位置：portals/website/src/lib/i18n/

职责：前端应用的翻译文案、语言路由、RSC 翻译上下文。
实现方案：next-intl（专为 Next.js App Router 设计）。

### 文件结构

portals/website/
├── messages/ # 翻译资源文件，放根目录
│ ├── zh/
│ │ ├── common.json # namespace: 通用词
│ │ ├── nav.json # namespace: 导航
│ │ ├── marketing.json # namespace: 营销页
│ │ ├── pricing.json # namespace: 定价
│ │ ├── checkout.json # namespace: 下单流程
│ │ └── legal.json # namespace: 法律条款
│ └── en/
│ ├── common.json
│ ├── nav.json
│ ├── marketing.json
│ ├── pricing.json
│ ├── checkout.json
│ └── legal.json
│
└── src/
└── lib/
└── i18n/
├── routing.ts # defineRouting，引用 SUPPORTED_LOCALES
├── navigation.ts # 类型安全的 Link、redirect、useRouter
└── request.ts # getRequestConfig，加载 messages/

### routing.ts 实现

import { defineRouting } from 'next-intl/routing';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@vxture/shared';

export const routing = defineRouting({
locales: SUPPORTED_LOCALES,
defaultLocale: DEFAULT_LOCALE,
});

### navigation.ts 实现

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, useRouter, usePathname } = createNavigation(routing);

### request.ts 实现

import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
const locale = (await requestLocale) ?? routing.defaultLocale;

// 按 namespace 分别加载，按需引入
const messages = {
common: (await import(`../../../messages/${locale}/common.json`)).default,
nav: (await import(`../../../messages/${locale}/nav.json`)).default,
marketing: (await import(`../../../messages/${locale}/marketing.json`)).default,
pricing: (await import(`../../../messages/${locale}/pricing.json`)).default,
checkout: (await import(`../../../messages/${locale}/checkout.json`)).default,
legal: (await import(`../../../messages/${locale}/legal.json`)).default,
};

return { locale, messages };
});

### 类型安全配置

文件：portals/website/src/types/i18n.types.ts

import zh from '../../messages/zh';
type Messages = typeof zh;
declare global {
interface IntlMessages extends Messages {}
}

### 组件使用规则

Server Component（无需 'use client'）：
import { useTranslations } from 'next-intl';
export default function HeroSection() {
const t = useTranslations('marketing');
return <h1>{t('hero.title')}</h1>;
}

Client Component（需要 'use client'）：
'use client';
import { useTranslations } from 'next-intl';
export function NavigationMenu() {
const t = useTranslations('nav');
return <nav>{t('home')}</nav>;
}

格式化工具在前端的使用：
// 直接从 @vxture/shared 引入，不通过 next-intl
import { formatCurrency } from '@vxture/shared';
import { useLocale } from 'next-intl';

export function PriceDisplay({ amount }: { amount: number }) {
const locale = useLocale();
return <span>{formatCurrency(amount, locale)}</span>;
}

---

## 禁止行为（AI 必须严格遵守）

1. 禁止在 @vxture/shared 中引入任何内部包
2. 禁止在 @vxture/shared 中引入 React、Next.js、NestJS
3. 禁止在 @vxture/core-locale 中引入 next-intl
4. 禁止在 @vxture/core-locale 中引入 @vxture/service-_ 或 @vxture/bff-_
5. 禁止在前端代码（portals/_、agent-studio/_）中引入 @vxture/core-locale
6. 禁止在 @vxture/design-system 组件内部调用 useTranslations 或任何 i18n 函数
   （design-system 组件只接收翻译好的字符串作为 props）
7. 禁止在 bff/_、services/_、agent-server/\* 中引入 next-intl
8. 禁止重复定义 Locale 类型，全平台唯一来源是 @vxture/shared
9. 禁止跨层调用：前端不调用 resolveLocale，后端不调用 useTranslations

---

## 速查表

| 需求                                       | 引入来源              | 可用层                      |
| ------------------------------------------ | --------------------- | --------------------------- |
| Locale 类型                                | @vxture/shared        | 全部                        |
| SUPPORTED_LOCALES 常量                     | @vxture/shared        | 全部                        |
| formatCurrency / formatDate / formatNumber | @vxture/shared        | 全部                        |
| resolveLocale（从请求解析语言）            | @vxture/core-locale   | bff、services、agent-server |
| localizeContent（服务端内容本地化）        | @vxture/core-locale   | bff、services、agent-server |
| useTranslations（组件翻译）                | next-intl             | portals/_、agent-studio/_   |
| useLocale（获取当前语言）                  | next-intl             | portals/_、agent-studio/_   |
| Link / redirect / useRouter（语言路由）    | @/lib/i18n/navigation | portals/website 内部        |
