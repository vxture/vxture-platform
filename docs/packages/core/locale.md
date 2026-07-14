# @vxture/core-locale

> ⚠️ 待大版本重构 | 迁移自 `packages/core/locale/AGENTS.md`
> 架构层参考：[`docs/architecture/03-core-layer.md`](../../architecture/03-core-layer.md)
> 能力域设计：[`docs/design/locale.md`](../../design/locale.md)

---

## 包信息

| 项     | 值                      |
| ------ | ----------------------- |
| 包名   | `@vxture/core-locale`   |
| 路径   | `packages/core/locale/` |
| @layer | `Infrastructure`        |

## 职责

服务端语言解析和内容本地化工具。

- `resolveLocale`：从请求中解析语言（Cookie / Accept-Language）
- `localizeContent`：从多语言对象中取对应语言的字符串

**与 `@vxture/shared` 的区别：**

- shared：仅定义类型和常量（Locale、SUPPORTED_LOCALES）
- core-locale：提供服务端解析和查找逻辑

## 依赖约束

**允许：** `@vxture/shared` · 层级通用约束见 [packages/index.md § Core 层通用约束](../index.md)

## 核心约束

- `resolveLocale` 仅在服务端调用（bff / services / agent-server）
- 语言解析优先级：Cookie（NEXT_LOCALE）> Accept-Language > DEFAULT_LOCALE
- `localizeContent` 回退策略：目标语言 > DEFAULT_LOCALE > 第一个可用 > 空字符串
- 类型和常量从 `@vxture/shared` 导入，不重复定义
