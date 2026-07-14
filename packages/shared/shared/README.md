# @vxture/shared

> **面向开发人员/AI 的使用文档**
> 本文档详细说明 @vxture/shared 包的功能、API 和使用方法，包含完整的导入方式、类型说明和代码示例。

## 包概述

@vxture/shared 是 Vxture 平台的**核心共享基础库**，提供以下能力：

- **纯工具函数**（格式化、验证、调试）
- **通用类型定义**（认证、主题、语言、API 响应、UI 语义化）
- **全局常量配置**（认证、主题、语言、UI）
- **目录/权益值域**（tier、订阅状态、组件角色、计量词汇的唯一权威取值集，product_220）
- **无依赖**：不依赖任何内部包或框架，运行于任何环境

## 安装和导入

```bash
# 通过 pnpm 安装（monorepo）
pnpm add @vxture/shared

# 导入方式（统一入口）
import {
  // 类型
  type UserInfo,
  type TokenData,
  type Theme,
  type Locale,
  type ApiResponse,

  // 常量
  AUTH_CONSTANTS,
  THEME_CONSTANTS,
  SEMANTIC_COLORS,

  // 语言相关（统一）
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,

  // 工具函数
  debugLog,
  debugWarn,
  debugError,
  formatCurrency,
  formatDate,
  formatNumber,
} from '@vxture/shared';
```

## 核心功能和方法

### 1. 语言系统

#### 语言类型和常量

```typescript
// 支持的语言列表（只读）
console.log(SUPPORTED_LOCALES); // ['zh-CN', 'en-US']

// 默认语言
console.log(DEFAULT_LOCALE); // 'zh-CN'

// 类型安全的语言变量
const locale: Locale = "en-US";

// 检查语言支持
const isSupported = SUPPORTED_LOCALES.includes(locale);
```

#### 格式化工具

```typescript
// 格式化货币
formatCurrency(100, "zh"); // '¥100.00'
formatCurrency(100, "en"); // '$100.00'
formatCurrency(100, "zh", "USD"); // '$100.00'

// 格式化日期
formatDate(new Date(), "zh"); // '2026/3/13'
formatDate(new Date(), "en"); // '3/13/2026'

// 格式化数字
formatNumber(1000.5, "zh"); // '1,000.5'
formatNumber(1000.5, "en"); // '1,000.5'
```

### 2. 认证系统

#### 类型定义

```typescript
// 用户信息
interface UserInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  permissions: string[];
  lastLogin?: number;
}

// Token 数据结构
interface TokenData {
  token: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### 认证常量

```typescript
// 存储键
AUTH_CONSTANTS.STORAGE_KEY; // 'auth-storage'

// Token 刷新缓冲区（30秒）
AUTH_CONSTANTS.TOKEN_REFRESH_BUFFER; // 30000

// 默认 Token 过期时间（1小时）
AUTH_CONSTANTS.DEFAULT_TOKEN_EXPIRY; // 3600

// 权限常量
AUTH_CONSTANTS.PERMISSIONS.ADMIN; // 'admin'
AUTH_CONSTANTS.PERMISSIONS.EDIT; // 'edit'
```

### 3. 主题系统

#### 主题类型

```typescript
// 有效主题类型
type Theme = "light" | "dark" | "system";

// 扩展主题类型（支持自定义主题）
type ThemeValue = Theme | (string & {});

// 使用示例
const defaultTheme: Theme = "light"; // ✅
const customTheme: ThemeValue = "tenant-blue"; // ✅
```

#### 主题常量

```typescript
// 默认主题
THEME_CONSTANTS.DEFAULT_THEME; // 'system'

// 可用主题（isExplicitDark：是否显式指定为深色，system 主题不确定，故为 false）
THEME_CONSTANTS.AVAILABLE_THEMES; // [
//   { name: 'system', displayName: '跟随系统', isExplicitDark: false },
//   { name: 'light',  displayName: '浅色',     isExplicitDark: false },
//   { name: 'dark',   displayName: '深色',     isExplicitDark: true  },
// ]

// 存储键
THEME_CONSTANTS.STORAGE_KEY; // 'theme-storage'

// HTML 属性
THEME_CONSTANTS.THEME_ATTRIBUTE; // 'data-theme'
```

### 4. 调试工具

#### 使用方式

```typescript
// 自动检测开发环境，无需手动配置
debugLog("应用已初始化");
debugWarn("使用了已废弃的 API");
debugError("严重错误");
```

### 5. API 响应类型

#### 标准响应类型

```typescript
// 成功响应
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: number;
}

// 错误响应
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: number;
}

// 联合类型
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// 使用示例
const response: ApiResponse<UserInfo> = {
  success: true,
  data: { id: "1", name: "用户" },
  timestamp: Date.now(),
};
```

### 6. UI 语义化系统

#### 语义色彩

```typescript
// 支持的语义色彩
console.log(SEMANTIC_COLORS); // ['primary', 'secondary', 'brand', 'info', 'success', 'warning', 'danger']

// 语义色彩类型
type SemanticColor =
  | "primary"
  | "secondary"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger";

// 使用示例
const buttonColor: SemanticColor = "primary";
```

### 7. 错误类型

```typescript
import {
  VxtureError,
  ValidationError,
  UnauthorizedError,
  isVxtureError,
} from "@vxture/shared";

// 抛出语义化错误
throw new ValidationError("邮箱格式不正确");
throw new UnauthorizedError(); // 默认 message: 'Unauthorized'

// 所有子类继承 VxtureError，携带 status / code / details / requestId
try {
  await someOp();
} catch (err) {
  if (isVxtureError(err)) {
    console.log(err.status, err.code); // 400, 'VALIDATION_ERROR'
    console.log(err.toJSON());
  }
}
```

可用子类：`ValidationError`(400) / `UnauthorizedError`(401) / `ForbiddenError`(403) / `NotFoundError`(404) / `ConflictError`(409) / `InternalServerError`(500)

### 8. 对象工具

```typescript
import { deepMerge, deepClone, isPlainObject } from "@vxture/shared";

// 深度合并（source 优先，数组替换不追加）
const merged = deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } });
// → { a: 1, b: { c: 2, d: 3 } }

// 深度克隆（基于 structuredClone，支持 Map/Set/循环引用）
const clone = deepClone({ a: { b: 1 } });
```

### 9. 跨 Portal 导航上下文

```typescript
import { encodePortalContext, decodePortalContext } from "@vxture/shared";

// 序列化（用于构造跳转 URL）
const qs = encodePortalContext({
  from: "website",
  returnTo: "https://...",
  caller: "Vxture 官网",
});
const url = `${CONSOLE_URL}?${qs}`;

// 反序列化（在目标 portal 入口调用）
// ⚠️ returnTo 仅验证类型，消费方必须自行校验 URL 合法性和 origin 白名单
const ctx = decodePortalContext(window.location.search); // null | PortalNavContext
```

### 10. 用户偏好常量

```typescript
import { PREFERENCE_CONSTANTS } from "@vxture/shared";

PREFERENCE_CONSTANTS.SYNC_STORAGE_KEY; // 'vx-user-preferences'（跨标签页同步用）
PREFERENCE_CONSTANTS.SYNC_EVENT; // 'vx:user-preferences'（同文档通知用）
PREFERENCE_CONSTANTS.DENSITY_COOKIE_KEY; // 'vx-density'
PREFERENCE_CONSTANTS.COOKIE_MAX_AGE; // 31536000（1 年，秒）
```

### 11. 目录/权益值域（Catalog value domains）

> 自 **1.3.0** 起提供。平台目录与权益体系的**值域唯一权威**（product_220）。

这些是各"轴"允许的字符串取值集合——数据库 CHECK 约束、seed、仓内服务、以及外部产品（arda 等）**全部对齐这里**。本包**从不**为迁就某个不合规产品派生别名或兼容值；不一致时是那个产品改回来。**纯值集 + 类型，零业务逻辑**（谁授予权益、如何投影/聚合、tier 如何排序——都在拥有它的域里，只读取这些值）。

```typescript
import {
  TIERS,
  COMPONENT_ROLES,
  SUBSCRIPTION_STATUSES,
  MERGE_STRATEGIES,
  CONSUME_MODES,
  METRIC_KINDS,
  type Tier,
  type ComponentRole,
  type SubscriptionStatus,
  type MergeStrategy,
  type ConsumeMode,
  type MetricKind,
} from "@vxture/shared";

TIERS; // ['free','starter','pro','business','enterprise']（五档，无第六）
COMPONENT_ROLES; // ['primary','bundled']
SUBSCRIPTION_STATUSES; // ['active','trialing','overdue','suspended','expired','cancelled']（顺序=代表状态优先级）
MERGE_STRATEGIES; // ['max','union','pool','tiered']
CONSUME_MODES; // ['divisible','atomic']
METRIC_KINDS; // ['counter','gauge']
```

| 值域 / 类型                                    | 取值                                                     | 用途                                                                                                                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TIERS` / `Tier`                               | free < starter < pro < business < enterprise             | 商业档位阶梯（§1），五档且仅五档                                                                                                                                                                                                       |
| `COMPONENT_ROLES` / `ComponentRole`            | primary, bundled                                         | plan 组件角色：primary 售 tier，bundled 为绑定 backing（§2）                                                                                                                                                                           |
| `SUBSCRIPTION_STATUSES` / `SubscriptionStatus` | active, trialing, overdue, suspended, expired, cancelled | 订阅自身生命周期状态，**数组顺序即 C2 代表状态优先级**（多订阅并存取前者）。`overdue` = 欠费宽限（扣款失败、催缴中、权益保留；支付面落地前平台不产出该值，预留防契约再动）。**"从未订阅" = 权益视图里 `null`（缺席），不是本集合的值** |
| `MERGE_STRATEGIES` / `MergeStrategy`           | max, union, pool, tiered                                 | product_metrics.merge_strategy（§2）                                                                                                                                                                                                   |
| `CONSUME_MODES` / `ConsumeMode`                | divisible, atomic                                        | pool metric 消费模式（reply-01 R5）                                                                                                                                                                                                    |
| `METRIC_KINDS` / `MetricKind`                  | counter, gauge                                           | platform_metrics.kind（§4 / D7）                                                                                                                                                                                                       |

> **铁律**：本包是权威，产品对齐本包，不是本包迁就产品。tier 就五档；谁想第六档 = 平台不支持，产品自行砍回五档。
> DB CHECK 与本文件的一致性由 `scripts/guardrails/check-catalog-domains.mjs`（`pnpm lint:catalog-domains`，已接 CI）强制校验；不一致时**改 DDL 对齐本包**。

## 脚本命令

```bash
# 构建产物（dist/）
pnpm build

# 类型检查
pnpm type-check
```

## 依赖和边界

### 允许的依赖

- **zod**：schema 校验
- **dayjs**：日期工具
- 其他轻量无副作用三方库

### 禁止的依赖

- 任何内部包（@vxture/core-_、@vxture/service-_ 等）
- NestJS / Next.js / React
- Prisma / axios / dotenv
- 浏览器专用 API（window、document、localStorage）
- Node.js 专用 API（fs、path、http）

## 使用场景示例

### 在服务端使用

```typescript
import { SUPPORTED_LOCALES, type Locale, formatNumber } from "@vxture/shared";

export function formatPrice(amount: number, currency: string, locale: Locale) {
  const formattedNumber = formatNumber(amount, locale);
  return `${formattedNumber} ${currency}`;
}

export function isValidLocale(lang: string): lang is Locale {
  return SUPPORTED_LOCALES.includes(lang as Locale);
}
```

### 在前端使用

```typescript
import { debugLog, DEFAULT_LOCALE } from "@vxture/shared";

// 获取用户偏好语言
function getUserLocale(): string {
  return localStorage.getItem("locale") || DEFAULT_LOCALE;
}
```
