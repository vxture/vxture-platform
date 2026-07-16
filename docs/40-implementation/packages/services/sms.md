# @vxture/service-sms

> 架构层参考：[`docs/30-design/architecture/04-service-layer.md`](../../../30-design/architecture/04-service-layer.md)

---

## 包信息

| 项     | 值                           |
| ------ | ---------------------------- |
| 包名   | `@vxture/service-sms`        |
| 路径   | `services/notification/sms/` |
| @layer | `Domain`                     |
| 框架   | NestJS                       |

## 职责

短信发送服务，通过阿里云 Dysmsapi 发送验证码短信。

## 目录结构

```
src/
├── module/         ← SmsModule
├── service/        ← SmsService
└── constants/      ← 短信模板 code、签名配置
```

## 依赖约束

```typescript
✅ @vxture/core-config / @vxture/shared
✅ @alicloud/dysmsapi20170525（阿里云短信 SDK）
❌ 其他 @vxture/service-*
```

## 限流策略

与 service-mail 完全一致，Redis key 格式为 `svc:rl:{scope}:{period}:{phone}`：

| 限制  | 周期   |
| ----- | ------ |
| 1 次  | 每分钟 |
| 5 次  | 每小时 |
| 10 次 | 每天   |

验证码 Redis key：`svc:code:{scope}:{phone}`，TTL 600s。

**消费方**：website-bff（手机号注册/登录验证码）、外部业务 BFF（如启用手机号认证）
