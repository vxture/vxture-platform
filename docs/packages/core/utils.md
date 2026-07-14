# @vxture/core-utils

> ⚠️ 待大版本重构 | 迁移自 `packages/core/utils/AGENTS.md`
> 架构层参考：[`docs/architecture/03-core-layer.md`](../../architecture/03-core-layer.md)

---

## 包信息

| 项     | 值                     |
| ------ | ---------------------- |
| 包名   | `@vxture/core-utils`   |
| 路径   | `packages/core/utils/` |
| @layer | `Infrastructure`       |

## 职责

平台级通用工具：日志、环境判断、类型守卫、错误类。

**与 `@vxture/shared` 的区别：**

- shared：纯通用工具，无平台意识
- core-utils：有平台意识的工具（结构化日志、环境判断）

## 目录结构

```
src/
├── utils/        # error.utils.ts, logger.utils.ts, env.utils.ts, type-guards.utils.ts
├── types/        # utils.types.ts
└── index.ts
```

## 依赖约束

**允许：** `@vxture/shared` · 层级通用约束见 [packages/index.md § Core 层通用约束](../index.md)

## 核心约束

- 日志工具需双端兼容（浏览器 console / Node.js 结构化输出）
- 环境判断通过特征检测，不依赖 `process.env.NODE_ENV`
- 类型守卫必须是纯函数，无副作用
