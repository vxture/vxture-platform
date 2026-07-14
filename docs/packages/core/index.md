# Core 层包文档

> @layer `Infrastructure` | 框架无关，Node.js + 浏览器双端兼容（database 仅服务端）
> 架构层参考：[`docs/architecture/03-core-layer.md`](../../architecture/03-core-layer.md)

---

## 包列表

| 包                           | 路径                      | 职责                                                 |
| ---------------------------- | ------------------------- | ---------------------------------------------------- |
| [`auth.md`](auth.md)         | `packages/core/auth/`     | JWT 验证、session 工具、权限基础类型（不含业务逻辑） |
| [`api.md`](api.md)           | `packages/core/api/`      | API 响应类型、NestJS 装饰器、错误码体系              |
| [`config.md`](config.md)     | `packages/core/config/`   | 环境变量加载、配置验证（Zod schema）                 |
| [`database.md`](database.md) | `packages/core/database/` | Prisma Client 工厂、迁移管理（⚠️ 待大幅重构）        |
| [`locale.md`](locale.md)     | `packages/core/locale/`   | i18n 解析链、BCP47 语言标签、服务端翻译加载          |
| [`mail.md`](mail.md)         | `packages/core/mail/`     | 邮件发送原语（SMTP 封装，模板渲染）                  |
| [`tenant.md`](tenant.md)     | `packages/core/tenant/`   | 租户上下文提取、tenant-id 中间件、多租户隔离工具     |
| [`utils.md`](utils.md)       | `packages/core/utils/`    | 服务端通用工具（加密、随机、分页等）                 |

---

## 核心约束

- **禁止**引用任何上层包（services / bff / portals / agent-server）
- **禁止**包含业务逻辑（业务规则属于 service 层）
- `core-database` 例外：仅服务端使用，不可在浏览器端 import
- 变更频率极低（`Very Slow`），修改前需全面评估影响范围
