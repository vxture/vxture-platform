# @vxture/core-config

> ⚠️ 待大版本重构 | 迁移自 `packages/core/config/AGENTS.md`
> 架构层参考：[`docs/architecture/03-core-layer.md`](../../architecture/03-core-layer.md)

---

## 包信息

| 项     | 值                      |
| ------ | ----------------------- |
| 包名   | `@vxture/core-config`   |
| 路径   | `packages/core/config/` |
| @layer | `Infrastructure`        |

## 职责

**唯一职责**：把 `process.env` 解析成强类型配置对象，通过 NestJS DI 注入给消费方。

## 依赖约束

```
@vxture/core-config
  ✅ zod（唯一运行时依赖）
  ✅ @nestjs/common（peerDependency）
  ✅ @nestjs/core（peerDependency）
  ❌ @vxture/shared
  ❌ @vxture/service-* / ai-sdk / 任何数据库/HTTP 客户端
```

## 严格禁止

- 引入运行时可变配置（无 set() / remove() / clear()）
- 实现事件系统、订阅、watch 机制
- 在 schema 里读取数据库或远程配置（仅读 `process.env`）
- 使用 `any` 类型

## 能力边界

| 能力                      | 正确位置              |
| ------------------------- | --------------------- |
| `deepMerge` / `deepClone` | `@vxture/shared`      |
| 租户级别配置              | `@vxture/core-tenant` |
| 功能开关 / Feature Flag   | 未来独立包            |
| 远程配置中心              | 未来扩展              |
