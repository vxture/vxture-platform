# @vxture/platform-browser — 浏览器环境工具包

> **面向开发人员/AI 的使用文档**
> 本文档详细说明如何使用 @vxture/platform-browser 包的功能和方法。
> 如需了解开发该包的约束和规范，请查看 `AGENTS.md`。

---

## 🌟 包概述

浏览器环境工具函数，封装浏览器 API。包含滚动、存储、剪贴板、视口等浏览器特定功能。

**核心特性：**

- 纯浏览器环境工具函数
- 类型安全的 API 设计
- 向后兼容支持
- 严格的环境检查

---

## 📦 安装

```bash
pnpm add @vxture/platform-browser
```

---

## 🚀 使用示例

### 滚动工具

```typescript
import {
  resetWindowScrollTop,
  type ScrollBehavior,
} from "@vxture/platform-browser";

// 重置窗口滚动到顶部（平滑动画）
resetWindowScrollTop("smooth");

// 重置窗口滚动到顶部（立即）
resetWindowScrollTop("instant");
```

---

## 📚 API 参考

### 滚动工具

#### `resetWindowScrollTop`

```typescript
/**
 * 重置窗口滚动到顶部
 * @param behavior - 滚动行为：'auto'（默认）| 'smooth' | 'instant'
 *
 * @example
 * resetWindowScrollTop('smooth');
 */
export const resetWindowScrollTop = (
  behavior: ScrollBehavior = "instant",
): void => {
  if (typeof window !== "undefined") {
    window.scrollTo({
      top: 0,
      behavior: behavior,
    });
  }
};
```

**类型定义：**

```typescript
export type ScrollBehavior = "auto" | "smooth" | "instant";
```

---

## 🛠 开发注意事项

### 环境检查

所有函数都包含环境检查，确保只在浏览器中执行：

```typescript
if (typeof window !== "undefined") {
  // 浏览器特定代码
}
```

### 导入路径

消费方只从 `@vxture/platform-browser` 导入，禁止深路径导入：

```typescript
// ✅ 正确
import { resetWindowScrollTop } from "@vxture/platform-browser";

// ❌ 错误
import { resetWindowScrollTop } from "@vxture/platform-browser/src/utils/resetScrollTop.utils";
```

---

## 📁 目录结构

```
packages/platform/browser/
├── src/
│   ├── utils/
│   │   └── resetScrollTop.utils.ts    # 滚动工具函数
│   └── index.ts               # 单一公共出口
├── README.md                  # 使用文档（本文档）
├── AGENTS.md                  # AI 编码指南
└── package.json               # 包配置
```

---

## 🔄 向后兼容性

包保持向后兼容性，所有废弃 API 会标记 `@deprecated` 注释。

---

## 📝 更新日志

### v1.0.0

- 初始版本
- 实现 `resetWindowScrollTop` 函数
- 添加类型定义 `ScrollBehavior`
- 完善文档和规范
