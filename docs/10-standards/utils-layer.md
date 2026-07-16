# Vxture Monorepo Utils 分层规范

## 1. 目的

随着 Vxture 平台的持续发展，各类工具函数（utils）会快速增长。如果缺乏统一规范，容易出现：

- 工具函数随意放置
- 不同包重复实现
- 浏览器代码进入 Node 环境
- React / UI 工具污染基础库

因此，本规范定义 **Utils 分层原则与归属规则**，确保代码结构长期可维护、可扩展。

---

# 2. Utils 分层原则

Vxture 的工具函数按照 **运行环境与依赖层级**划分为四类：

| 层级           | 作用              | 是否允许 DOM | 是否允许 React |
| -------------- | ----------------- | ------------ | -------------- |
| shared utils   | 通用纯函数工具    | ❌           | ❌             |
| core utils     | 平台核心工具      | ❌           | ❌             |
| browser utils  | 浏览器环境工具    | ✅           | ❌             |
| design helpers | UI / 设计辅助工具 | ✅           | ✅             |

依赖关系必须遵循：

```
shared
  ↑
core
  ↑
browser
  ↑
design
```

禁止反向依赖。

---

# 3. Pure Utils（`@vxture/core-utils`）

## 包

```
@vxture/core-utils
```

> 注意：此层名为"Pure Utils"以区分 `@vxture/shared` 包。
> `@vxture/shared` 包含平台级类型、常量与 locale 格式化工具；
> `@vxture/core-utils` 提供通用纯函数工具（不含业务语义）。

## 作用

提供 **运行环境无关（runtime-agnostic）的纯工具函数**。

这些工具：

- 不依赖 DOM
- 不依赖 React
- 不依赖 Node API
- 可以运行在任何环境（Node / Browser / Edge / Serverless / AI Agent）

## 目录

```
packages/core/utils/src/
  array/
  object/
  string/
  date/
  number/
```

示例函数：

```
deepMerge()
isEmpty()
formatDate()
clamp()
debounce()
throttle()
```

禁止出现：

```
window
document
localStorage
navigator
React
```

---

# 4. Core Utils

## 包

```
@vxture/core-*
```

例如：

```
@vxture/core-api
@vxture/core-config
@vxture/core-env
```

## 作用

为平台核心能力提供工具函数。

典型用途：

```
API 工具
Token 工具
Tenant 工具
Locale 工具
配置处理
```

示例：

```
createApiClient()
buildHeaders()
parseTenantId()
normalizeLocale()
```

这些工具仍然：

```
❌ 不允许 DOM
❌ 不允许 React
```

---

# 5. Browser Utils

## 建议新增包

```
@vxture/platform-browser
```

用于存放 **浏览器运行环境工具**。

## 作用

封装浏览器 API：

```
window
document
navigator
localStorage
scroll
clipboard
viewport
```

## 目录结构

```
packages/platform/browser
  src/
    scroll.utils.ts
    storage.utils.ts
    clipboard.utils.ts
    viewport.utils.ts
    resize-observer.ts
```

示例函数：

```
scrollToTop()
scrollToElement()
copyToClipboard()
getViewportSize()
saveLocalStorage()
```

允许使用：

```
window
document
navigator
```

但：

```
❌ 不允许 React
```

---

# 6. Design Helpers

## 包

```
@vxture/design-system
```

## 作用

UI 和设计系统辅助工具。

典型场景：

```
className helpers
animation helpers
theme helpers
DOM helpers
component utilities
```

目录示例：

```
packages/design/design-system/src/
  utils/
    cn.ts
    focus-ring.ts
    animation.utils.ts
    scroll-lock.ts
```

允许：

```
DOM
React
CSS helpers
```

---

# 7. Utils 放置规则

开发新工具函数时，请遵循以下判断流程：

### Step 1

是否是 **纯函数工具**？

例如：

```
object
array
string
math
date
```

→ 放入

```
@vxture/core-utils
```

---

### Step 2

是否依赖 **平台能力**？

例如：

```
api
tenant
locale
config
token
```

→ 放入

```
@vxture/core-*
```

---

### Step 3

是否依赖 **浏览器 API**？

例如：

```
window
document
scroll
storage
clipboard
```

→ 放入

```
@vxture/platform-browser
```

---

### Step 4

是否属于 **UI / React / 设计系统**？

例如：

```
className helpers
UI animation
component utilities
```

→ 放入

```
@vxture/design-system
```

---

# 8. 典型案例

### scroll 工具

```
scrollToTop()
scrollIntoView()
scrollWithOffset()
```

依赖：

```
window
document
```

归属：

```
@vxture/platform-browser
```

---

### debounce

```
debounce()
throttle()
```

纯函数：

```
@vxture/core-utils
```

---

### className helper

```
cn()
classNames()
```

UI 相关：

```
@vxture/design-system
```

---

### API helper

```
buildApiUrl()
parseResponse()
```

平台逻辑：

```
@vxture/core-api
```

---

# 9. 常见错误

错误示例：

```
shared/utils/scroll.ts
```

问题：

```
shared 不允许 DOM
```

---

错误示例：

```
core/utils/classnames.ts
```

问题：

```
className 属于 UI
```

---

错误示例：

```
design-system/utils/debounce.ts
```

问题：

```
纯函数应放 shared
```

---

# 10. 总结

Vxture 的 utils 分层原则：

```
shared   = 纯函数
core     = 平台工具
browser  = 浏览器工具
design   = UI 工具
```

依赖方向：

```
shared
  ↑
core
  ↑
browser
  ↑
design
```

遵循该规范可以保证：

- monorepo 结构清晰
- 运行环境隔离
- 工具复用率高
- 长期可维护

```

```
