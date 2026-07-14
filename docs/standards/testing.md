# 测试策略

> 更新：2026-05-14

本文档定义各层的测试边界、测试类型选择和禁止项。目标：最小化测试维护成本，最大化信心。

---

## 核心原则

1. **禁止 mock 数据库**：service 层必须使用真实 PostgreSQL，用 mock 挡住数据库的测试只验证了代码能调用 mock，不验证 SQL 是否正确。
2. **测试金字塔**：大量单元测试 → 适量集成测试 → 少量 E2E。越往上成本越高，越往下反馈越快。
3. **测试与源码同目录**：`{module}.spec.ts` 放在被测文件旁边，不建 `__tests__/` 目录。
4. **E2E 只覆盖关键路径**，不追求 100% 功能覆盖。

---

## 各层测试规范

### shared 层 / core 层

**测试类型**：单元测试（Unit Test）
**框架**：Vitest
**运行命令**：`pnpm -F @vxture/shared test`

- 纯函数，无 IO，无框架依赖 → 只需单元测试，无需 mock
- 覆盖率目标：**≥ 90%**（核心工具函数必须全覆盖）
- 不允许：启动 NestJS 容器、连接数据库、发 HTTP 请求

```typescript
// ✅ 正确：纯函数直接测
import { resolveLocale } from "./locale.utils";
test("resolves zh-CN from Accept-Language", () => {
  expect(resolveLocale("zh-CN,zh;q=0.9")).toBe("zh-CN");
});

// ❌ 错误：在 shared 层测试中使用 jest.mock()
jest.mock("@vxture/core-database"); // shared 根本不应该依赖 database
```

---

### service 层

**测试类型**：集成测试（Integration Test）
**框架**：Vitest + 真实 PostgreSQL（测试专用 DB）+ 真实 Redis
**运行命令**：`pnpm -F @vxture/service-iam test:integration`

- **禁止 mock 数据库**：必须连接真实 PostgreSQL，原因见 docs/decisions/ 未来 ADR
- 测试前：`beforeAll` 中运行 Prisma migrate reset + seed
- 测试后：`afterAll` 中清理测试数据或 rollback
- 测试数据使用 **Factory 函数**生成，禁止 fixture JSON 文件

```typescript
// ✅ 正确：使用真实数据库
beforeAll(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
});

test("createTenant assigns trial plan", async () => {
  const tenant = await iamService.createTenant({ ownerId: "user-1" });
  expect(tenant.plan).toBe("trial");
});

// ❌ 错误：mock PrismaClient
jest.mock("@prisma/client");
```

---

### BFF 层

**测试类型**：HTTP 集成测试
**框架**：Vitest + Supertest + NestJS Test Module
**运行命令**：`pnpm -F @vxture/bff-auth test`

- 使用 NestJS `Test.createTestingModule()` 启动完整模块
- JWT 验证：使用真实测试密钥签发有效 token（禁止 mock `AuthGuard`）
- 数据库：service 层调用可以 mock（BFF 测试重点是中间件链，不是业务逻辑）
- 测试内容：守卫拦截、tenant 解析、权限校验、响应结构

```typescript
// ✅ 正确：完整 NestJS 模块 + 真实 JWT
const app = await Test.createTestingModule({
  imports: [AuthModule],
}).compile();

const token = signTestJwt({ userId: "u1", userType: "tenant_user" });

await request(app.getHttpServer())
  .post("/auth/session")
  .set("Cookie", `vx_tenant_access_token=${token}`)
  .expect(200);
```

---

### agent-server 层

**测试类型**：集成测试
**框架**：Vitest + NestJS Test Module
**特殊规则**：

- `@vxture/model-runtime-client` LLM 调用：**必须 mock**（调用真实 LLM 成本高、结果不确定）
- 数据库（Prisma）：使用真实测试 DB
- 测试重点：CallerContext 二次校验、ToolRegistry 白名单、会话持久化

```typescript
// ✅ LLM mock，数据库真实
const mockLlm = { stream: vi.fn().mockReturnValue(fakeStream()) };
```

---

### 前端层（portals / agent-studio）

**组件测试**：

- 框架：Vitest + React Testing Library
- 范围：独立纯 UI 组件（按钮、表单、输入框）
- 禁止：为每个页面写完整渲染测试（成本极高，与 E2E 重叠）

**E2E 测试**：

- 框架：Playwright
- 范围：**仅关键用户路径**，每个 Portal 不超过 5-10 个核心 flow

```
E2E 覆盖的场景（示例）：
✅ 邮箱注册 → 自动创建 Personal Tenant → 进入 Console
✅ 管理员登录 admin → Varda 对话 → 收到流式回复
✅ 租户用户邀请成员 → 成员接受邀请 → 权限生效

❌ 不需要 E2E 的场景：
❌ 每个表单的每个验证规则
❌ 每个列表页的排序/过滤
❌ 纯 UI 样式渲染
```

---

## 测试数据规范

**使用 Factory，不使用 Fixture：**

```typescript
// ✅ Factory（灵活，可组合）
function createTestUser(overrides?: Partial<User>): User {
  return { id: randomUUID(), email: "test@example.com", ...overrides };
}

// ❌ Fixture（JSON 文件，脆弱，与 Schema 变更不同步）
import testUser from "./fixtures/user.json";
```

---

## CI 中的测试执行

```yaml
# 单元测试（每次 PR）
- run: pnpm -F './packages/shared' test
- run: pnpm -F './packages/core/*' test

# 集成测试（每次 PR，需要 docker services）
- services:
    postgres: { image: postgres:16 }
    redis: { image: redis:7 }
- run: pnpm -F './services/*/*' test:integration

# E2E（仅 main 分支合并后）
- run: pnpm -F '@vxture/admin' test:e2e
```
