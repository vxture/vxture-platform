# Fix: AccessTokenRevocationService Redis 配置迁移

## 目标

将 `packages/core/auth/src/session/token-revocation.service.ts` 中的 6 个
`process.env` 直读（`REDIS_URL/HOST/PORT/PASSWORD/DB/KEY_PREFIX`）替换为 NestJS DI 注入。

## 方案

**DI Token 注入（不引入 core-auth → core-config 包依赖）**

- 在 `core-auth` 内定义 `REDIS_REVOCATION_CONFIG` Symbol token + `RedisRevocationConfig` 接口
- `AccessTokenRevocationService` 通过 `@Inject(REDIS_REVOCATION_CONFIG)` 接收配置
- 各 BFF `AppModule` 用 `useFactory` 将 `VxConfigService.redis` 注入该 token
- `RedisConfig`（core-config）字段是 `RedisRevocationConfig` 的超集，结构兼容

## 步骤进展

| #   | 步骤                                                                | 状态    | 说明                                   |
| --- | ------------------------------------------------------------------- | ------- | -------------------------------------- |
| 1   | 定义 `RedisRevocationConfig` 接口 + `REDIS_REVOCATION_CONFIG` token | ✅ 完成 | `session/redis-revocation-config.ts`   |
| 2   | 重写 `AccessTokenRevocationService` 使用注入配置                    | ✅ 完成 | 移除 `resolveRedisRuntimeConfig()`     |
| 3   | 从 `session/index.ts` 及包 `index.ts` 导出新 token/接口             | ✅ 完成 |                                        |
| 4   | 更新当时仓内 BFF `AppModule` 提供 `REDIS_REVOCATION_CONFIG`         | ✅ 完成 | P7b 后 Ruyin BFF 已迁出                |
| 5   | 类型检查：core-auth + 当时仓内 BFF                                  | ✅ 完成 | 全部 0 错误                            |
| 6   | Commit + Push + PR                                                  | ✅ 完成 | 追加到 PR #20（fix/session-auth-gaps） |

## 文件变更清单

| 文件                                                         | 操作                          |
| ------------------------------------------------------------ | ----------------------------- |
| `packages/core/auth/src/session/redis-revocation-config.ts`  | 新建                          |
| `packages/core/auth/src/session/token-revocation.service.ts` | 修改                          |
| `packages/core/auth/src/session/index.ts`                    | 修改（导出新符号）            |
| `packages/core/auth/src/index.ts`                            | 修改（透传导出）              |
| `bff/admin-bff/src/app.module.ts`                            | 修改（添加 factory provider） |
| `bff/console-bff/src/app.module.ts`                          | 修改                          |
| `bff/varda-bff/src/app.module.ts`                            | 修改                          |
| `bff/website-bff/src/app.module.ts`                          | 修改                          |
