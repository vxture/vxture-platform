# ADR-001: auth-bff 作为唯一 JWT 签发者

**状态**：✅ Accepted
**日期**：2026-03-01

---

## 背景

平台 BFF 层按认证方式分为三类：

| 类型                   | BFF                                           | 登录方式                                         |
| ---------------------- | --------------------------------------------- | ------------------------------------------------ |
| **Platform（控制面）** | website-bff / admin-bff / console-bff         | 有独立 login 页，auth-bff 直接签发 JWT           |
| **Business（应用层）** | varda-bff / agent-template-bff / 外部业务 BFF | 无独立登录页，跳转 console 登录，凭已有 JWT 访问 |
| **功能型**             | auth-bff / gateway-bff                        | 独立职责，不参与上述分类                         |

如果每个 BFF 独立持有签发逻辑，会导致：

- JWT claims schema 分散，字段变更需同步多处
- 签发密钥（`JWT_SECRET` / `JWT_REFRESH_SECRET`）在多个服务专属 env 中重复持有，泄露面扩大
- 黑名单/吊销逻辑重复实现，一致性无法保证
- OAuth 回调处理代码重复

## 决策选项

### 选项 A：每个 BFF 独立签发

**缺点**：密钥分散，schema 难统一，黑名单逻辑重复，审计困难。

### 选项 B：独立 Auth 微服务

**缺点**：引入额外服务层级；登录流程本身是 BFF 职责范围，再分层过度工程化。

### 选项 C：auth-bff 作为唯一签发者，其他 BFF 委托

auth-bff 负责所有 JWT 签发。其他 BFF 需要签发时通过内部接口 `POST /auth/internal/sign` 委托，用 `x-vxture-internal-auth` 头保护。

**优点**：签发逻辑和密钥集中，黑名单唯一实现，claims schema 改一处即全局生效。
**缺点**：auth-bff 成为认证关键路径上的单点；OAuth 回调后多一次内部 HTTP 跳。

## 决策

采用**选项 C**，auth-bff 为唯一 JWT 签发者。

### 实施范围

| 类型                                              | 状态                                            |
| ------------------------------------------------- | ----------------------------------------------- |
| Platform BFF（website / admin / console）         | ✅ 已实施                                       |
| Business BFF（varda / agent-template / 外部业务） | 🔲 规划中（跳转 console 登录，凭已有 JWT 访问） |

Business BFF 无需独立签发——认证流程如下：

```
请求到达 Business BFF
    │
    ▼
读取浏览器已有 Cookie（由 console 登录时 auth-bff 签发）
    │── Cookie 有效 → 验证 JWT → 正常处理请求
    └── Cookie 缺失 / 无效 / 过期 → 302 跳转 console 登录页
                                      （携带 redirect 参数，登录后回跳）
```

Business BFF 只做验证，不签发，不持有签发密钥。

### Redis 依赖的 fail 策略

auth-bff 对 Redis 有三种用途，不同场景采用不同的 fail 策略：

| Redis 用途                | 故障策略        | 理由                                                                                |
| ------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| jti 黑名单（logout 吊销） | **fail-open**   | access token 会按配置自然过期，故障窗口风险可控；fail-closed 会导致所有在线用户被踢 |
| refresh token 验证        | **fail-closed** | 无法验证刷新凭证真实性，不可发放新 token                                            |
| 空闲超时检查              | **fail-open**   | 不因基础设施故障踢用户下线，可用性优先                                              |

> JWT 签名验证为纯加密运算，不依赖 Redis，始终可用。

### 附加安全机制：会话空闲超时（🔲 规划中，目标 4h）

在 access token（15min）和 refresh token（7d）之外，引入**空闲超时**：用户连续 4 小时无操作，会话自动失效。

**实现方式（Redis 滑动窗口）：**

```
每次认证通过的请求 → auth 中间件更新 Redis key
  key:  session:activity:{userId}:{surface}
  TTL:  4h（每次请求自动续期）

验证时：
  key 存在 → 活跃，放行并续期 TTL
  key 不存在 → 401 SESSION_IDLE_TIMEOUT，前端跳登录页
  Redis 不可用 → fail-open，跳过超时检查，不踢用户
```

**适用范围**：Platform BFF 全部启用；Business BFF 继承 console 会话，不独立计时。

**配置项：**

```bash
SESSION_IDLE_TIMEOUT=14400  # 秒，默认 4h
```

豁免端点：`/auth/*`、`/health`。

## 后果

**正面：**

- JWT claims schema 改一处即全局生效
- 黑名单/吊销逻辑唯一实现，logout 一致性有保证
- 签发密钥只在 auth-bff 持有，Secret rotation 只改一处
- 登录审计日志集中在 auth-bff
- 空闲超时有效防范 stolen token 和无人值守终端风险

**负面：**

- OAuth 回调后需额外调用一次 auth-bff 内部接口（同 Docker 网络，延迟 < 1ms）
- auth-bff 不可用时，所有新登录失败（已有 JWT 的存量用户不受影响）
- 空闲超时每次认证请求增加一次 Redis 读写（延迟 ~0.1ms，可忽略）
- 滑动窗口需在所有 Platform BFF 的 auth 中间件统一接入

---

_决策人：架构组 | Platform BFF 已实施；Business BFF 和空闲超时待实施_
