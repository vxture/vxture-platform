# Service 层包文档

> @layer `Domain` | 框架：NestJS | 按域分组，跨 service 调用通过 HTTP
> 架构层参考：[`docs/architecture/04-service-layer.md`](../../architecture/04-service-layer.md)

---

## 包列表

### Model 域

| 包                                       | 路径                       | 端口 | 职责                                                                                              |
| ---------------------------------------- | -------------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| [`model-platform.md`](model-platform.md) | `services/model/platform/` | 3100 | Model Platform 当前合并实现：模型控制面 + 模型运行面。所有 agent-server 的 LLM 调用必须经过此服务 |

### Identity 域

| 包                                   | 路径                              | 职责                                       |
| ------------------------------------ | --------------------------------- | ------------------------------------------ |
| [`iam.md`](iam.md)                   | `services/identity/iam/`          | 账号隔离管理、账户生命周期、跨租户身份查询 |
| [`organization.md`](organization.md) | `services/identity/organization/` | 组织结构、部门、成员关系                   |

### Commerce 域

| 包                                   | 路径                              | 职责                         |
| ------------------------------------ | --------------------------------- | ---------------------------- |
| [`billing.md`](billing.md)           | `services/commerce/billing/`      | 账单生成、支付流水、发票     |
| [`subscription.md`](subscription.md) | `services/commerce/subscription/` | 订阅计划、用量配额、续期逻辑 |

### Notification 域

| 包                   | 路径                          | 职责                                   |
| -------------------- | ----------------------------- | -------------------------------------- |
| [`mail.md`](mail.md) | `services/notification/mail/` | 邮件发送服务（验证码、通知、重置密码） |
| [`sms.md`](sms.md)   | `services/notification/sms/`  | 短信发送服务（验证码、告警）           |

### Support 域

| 包                       | 路径                       | 职责                                 |
| ------------------------ | -------------------------- | ------------------------------------ |
| [`ticket.md`](ticket.md) | `services/support/ticket/` | 工单管理：创建、分配、状态流转、消息 |

---

## 核心约束

- **禁止**跨 service 直接 import，跨服务调用必须走 HTTP
- **禁止**向上引用 bff / portals / agent-studio
- PrismaClient 只在 service 层 repository 子层使用，禁止在 BFF 或更高层直接操作数据库
- model-platform 是当前所有 LLM 调用的唯一入口；目标架构中它对应 model-runtime，禁止绕过直连 provider SDK
