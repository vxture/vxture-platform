# @vxture/platform-browser

> 架构层：`Infrastructure`（浏览器端专用，见 `docs/architecture/03-core-layer.md`）

---

## 包信息

| 项     | 值                               |
| ------ | -------------------------------- |
| 包名   | `@vxture/platform-browser`       |
| 路径   | `packages/platform/browser/`     |
| @layer | `Infrastructure`（浏览器端专用） |

## 职责

浏览器端平台工具集，为所有 portal 和 agent-studio 提供通用的浏览器操作封装。

## 已实现模块

```
src/utils/
├── portal-entry.utils.ts   ← Portal 入口工具（页面初始化 / 环境检测）
├── preferences.utils.ts    ← 用户偏好持久化（localStorage 封装）
└── resetScrollTop.utils.ts ← 滚动位置重置工具
```

## 依赖约束

```typescript
✅ @vxture/shared（类型 / 常量）
❌ @vxture/core-*（core 层仅 Node.js，不可在浏览器使用）
❌ @vxture/service-* / bff-* / ai-sdk
❌ 任何 Node.js 专属 API（fs / process 等）
```

## 使用方式

```typescript
import { resetScrollTop } from "@vxture/platform-browser";
import { getPreference, setPreference } from "@vxture/platform-browser";
```

## 扩展原则

- 新增工具必须是**纯浏览器 API**，不依赖 Node.js 环境
- 工具函数必须是**无副作用的纯函数**或**有明确隔离的状态操作**
- 禁止在此包中引入业务逻辑
