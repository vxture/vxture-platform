# BFF 层包文档

> @layer `Application` | 框架：业务型 BFF → NestJS，代理型 BFF → Hono（见 ADR-004）
> 架构层参考：[`docs/30-design/architecture/05-bff-layer.md`](../../../30-design/architecture/05-bff-layer.md)

---

## 分类

### 功能型 BFF

| 包                                     | 路径                | 端口 | 职责                                                              |
| -------------------------------------- | ------------------- | ---- | ----------------------------------------------------------------- |
| [`auth.md`](./auth.md)                 | `bff/auth-bff/`     | 3090 | JWT 唯一签发源，OAuth 回调，Token 吊销                            |
| [`gateway.md`](./gateway.md)           | `bff/gateway-bff/`  | 8000 | 路径前缀路由转发，零鉴权零业务逻辑（Hono）                        |
| [`platform-api.md`](./platform-api.md) | `bff/platform-api/` | 3041 | 产品面 S2S：C2 权益/可见集 + C3 consume/gauge + commerce 后台作业 |

### Platform BFF（有独立登录页，直接签发 JWT）

| 包                           | 路径               | 端口 | 职责                                          |
| ---------------------------- | ------------------ | ---- | --------------------------------------------- |
| [`website.md`](./website.md) | `bff/website-bff/` | 3011 | 注册、登录、租户初始化                        |
| [`console.md`](./console.md) | `bff/console-bff/` | 3021 | 租户管理、成员、账单、订阅                    |
| [`admin.md`](./admin.md)     | `bff/admin-bff/`   | 3031 | 平台运营：用户、租户、配置、工单、AI 模型管理 |

### Business BFF（复用 console Cookie，未登录跳转 console 登录页）

| 包                                         | 路径                      | 端口 | 职责                                                 |
| ------------------------------------------ | ------------------------- | ---- | ---------------------------------------------------- |
| [`varda.md`](./varda.md)                   | `bff/varda-bff/`          | 3121 | Varda 智能助手 BFF，SSE 流式转发，CallerContext 组装 |
| [`agent-template.md`](./agent-template.md) | `bff/agent-template-bff/` | TBD  | 新 Agent BFF fork 起点                               |

---

## 共同约束

- BFF 层**禁止直接操作数据库**，禁止 import Prisma Client
- BFF 层**禁止直接调用 LLM**，AI 请求通过 agent-server → model-platform 路由
- Business BFF 不持有 JWT 签发密钥，仅做验证
- 跨服务调用 auth-bff 必须经 `x-vxture-internal-auth` 头鉴权
