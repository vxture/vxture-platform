# 错误处理规范

> 更新：2026-05-14

本文档定义各层的错误分类、响应格式、异常传播规则和禁止项。目标：错误信息对调用方有意义，对攻击者无价值，对运维可追踪。

---

## 1. 统一错误响应格式

所有 BFF 对外（浏览器侧）返回的错误响应必须符合以下结构：

```typescript
// @vxture/shared — ApiErrorResponse
interface ApiErrorResponse {
  code: string; // 语义错误码，SCREAMING_SNAKE_CASE
  message: string; // 面向用户的可读描述（中文或英文，视 locale 而定）
  requestId?: string; // 链路追踪 ID（由 BFF 全局拦截器注入）
}
```

**HTTP 状态码 → 错误码映射原则：**

| HTTP 状态 | 适用场景                             | 示例 code                                          |
| --------- | ------------------------------------ | -------------------------------------------------- |
| 400       | 参数校验失败、业务规则违反           | `INVALID_PARAM`、`EMAIL_ALREADY_EXISTS`            |
| 401       | 未认证（无 token 或 token 无效）     | `UNAUTHORIZED`、`TOKEN_EXPIRED`                    |
| 403       | 已认证但无权限                       | `FORBIDDEN`、`TENANT_ACCESS_DENIED`                |
| 404       | 资源不存在                           | `NOT_FOUND`、`USER_NOT_FOUND`                      |
| 409       | 状态冲突                             | `DUPLICATE_REQUEST`、`SUBSCRIPTION_ALREADY_ACTIVE` |
| 422       | 业务语义错误（参数合法但业务不允许） | `QUOTA_EXCEEDED`、`PLAN_DOWNGRADE_NOT_ALLOWED`     |
| 429       | 限流                                 | `RATE_LIMIT_EXCEEDED`                              |
| 500       | 服务内部错误（不暴露详情）           | `INTERNAL_ERROR`                                   |
| 503       | 依赖服务不可用                       | `SERVICE_UNAVAILABLE`                              |

---

## 2. 错误码命名规范

```
格式：SCREAMING_SNAKE_CASE，动词 + 名词（或仅名词）

✅ INVALID_EMAIL
✅ USER_NOT_FOUND
✅ QUOTA_EXCEEDED
✅ TOKEN_EXPIRED
✅ TENANT_ACCESS_DENIED

❌ error_invalid_email    # 小写
❌ InvalidEmail           # PascalCase
❌ err001                 # 数字编码（无语义）
❌ SOMETHING_WENT_WRONG   # 过于泛化（仅限 fallback）
```

---

## 3. 各层错误处理策略

### 3.1 Service 层 — 抛出域异常

Service 层**只抛异常，不处理 HTTP 映射**。使用语义异常类，不使用 NestJS HttpException：

```typescript
// ✅ 正确：抛出域异常，HTTP 映射由 BFF ExceptionFilter 处理
import { NotFoundException, ConflictException } from "@vxture/core-api";

class TenantService {
  async findById(id: string) {
    const tenant = await this.repo.find(id);
    if (!tenant) throw new NotFoundException("TENANT_NOT_FOUND");
    return tenant;
  }
}

// ❌ 错误：Service 层引入 HTTP 语义
import { HttpException } from "@nestjs/common";
throw new HttpException("Not Found", 404); // Service 不知道 HTTP
```

### 3.2 BFF 层 — 全局 ExceptionFilter

BFF 统一通过 `GlobalExceptionFilter` 捕获异常并转换为标准响应：

```typescript
// ✅ NestJS 全局过滤器（每个 BFF 注册一次）
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = ctx.getRequest<Request>().headers["x-request-id"];

    if (exception instanceof DomainException) {
      return response.status(exception.httpStatus).json({
        code: exception.code,
        message: exception.message,
        requestId,
      });
    }

    // 未预期异常：不暴露内部细节
    this.logger.error("Unhandled exception", { exception, requestId });
    return response.status(500).json({
      code: "INTERNAL_ERROR",
      message: "服务暂时不可用，请稍后重试",
      requestId,
    });
  }
}
```

**禁止在 BFF controller 中各自 try/catch 后手动返回错误对象** —— 所有未捕获异常统一走 Filter。

### 3.3 BFF 层 — 调用上游服务时的错误处理

BFF 调用 auth-bff / service 层时，需将上游错误转换为本层语义：

```typescript
// ✅ 正确：捕获上游错误，转换语义，不透传原始 HTTP 状态
try {
  await this.authBff.verifyToken(token);
} catch (e) {
  if (e.status === 401) throw new UnauthorizedException("TOKEN_EXPIRED");
  throw new ServiceUnavailableException("AUTH_SERVICE_UNAVAILABLE");
}

// ❌ 错误：直接 re-throw 上游原始错误（泄露内部服务结构）
throw e;
```

### 3.4 agent-server 层 — 工具调用错误

Tool Use Loop 中工具执行失败时，将错误作为工具结果返回给 LLM，不中断 Loop：

```typescript
// ✅ 正确：工具错误结构化返回，让 LLM 决策
async executeTool(name: string, input: unknown) {
  try {
    return { success: true, result: await this.registry.run(name, input) };
  } catch (e) {
    return { success: false, error: e.message }; // LLM 可据此重试或告知用户
  }
}

// ❌ 错误：工具抛异常直接中断整个 Loop
```

### 3.5 Portal / Agent Studio 层 — 用户侧展示

前端只展示 `code` 和 `message`，**禁止展示 stack trace 或原始 HTTP 错误**：

```typescript
// ✅ 正确：展示语义错误
const { code, message } = error.response.data;
showToast(message); // 或根据 code 显示不同 UI

// ❌ 错误：暴露内部信息
showToast(error.stack);
console.error(JSON.stringify(error)); // 避免在生产环境打印完整错误对象到控制台
```

---

## 4. requestId 链路追踪

每个请求必须携带 `requestId`（UUID），贯穿整个调用链：

```typescript
// BFF 入口中间件（统一生成或透传）
app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] ?? crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
});
```

- 浏览器发起请求时：`x-request-id` 可由前端生成，也可在 BFF 生成
- 跨服务调用时：BFF → agent-server / service 必须透传 `x-request-id` Header
- 所有 log 必须包含 `requestId`，日志聚合时可按此字段检索完整请求链路

---

## 5. 禁止项

```
❌ 禁止在错误响应中返回 stack trace（生产环境）
❌ 禁止 500 错误暴露数据库连接字符串、SQL 语句、内部路径
❌ 禁止在 BFF controller 中 swallow 错误（空 catch，静默失败）
❌ 禁止在 service 层使用 HttpException（service 不应感知 HTTP 语义）
❌ 禁止对认证错误（401/403）返回 200 状态码
❌ 禁止前端展示原始英文技术错误给中文用户（需有 i18n 映射）
```

---

## 6. 错误处理检查清单（PR）

```
□ 新增 BFF endpoint 有对应的 ExceptionFilter 覆盖
□ Service 层异常使用域异常类，未混入 HttpException
□ 调用上游服务时有错误转换，不透传上游原始错误
□ 500 响应不含内部实现细节（数据库报错、文件路径等）
□ 工具执行失败返回结构化错误结果，未中断 Tool Use Loop
□ requestId 在跨服务调用时已透传
```
