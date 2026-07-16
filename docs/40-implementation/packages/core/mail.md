# @vxture/core-mail

> 更新：2026-05-12
> 架构层参考：[`docs/30-design/architecture/03-core-layer.md`](../../../30-design/architecture/03-core-layer.md)
> 消费方文档：[`docs/40-implementation/packages/bff/console.md`](../bff/console.md) · [`docs/40-implementation/packages/bff/admin.md`](../bff/admin.md)

---

## 包信息

| 项     | 值                                              |
| ------ | ----------------------------------------------- |
| 包名   | `@vxture/core-mail`                             |
| 路径   | `packages/core/mail/`                           |
| @layer | `Infrastructure`                                |
| 消费方 | `bff/console-bff` / `bff/admin-bff`（事务邮件） |

---

## 定位

`@vxture/core-mail` 是平台的**事务邮件基础层**，封装 nodemailer，对上层提供单一的 `MailService.send()` 接口。

区别于 `@vxture/service-mail`（`services/notification/mail/`，包含验证码发送和限流逻辑），`core-mail` 是纯 Infrastructure 层的通用邮件发送能力，不包含业务模板。

---

## 使用方式

在 NestJS 模块中注册：

```typescript
import { MailModule } from "@vxture/core-mail";

@Module({
  imports: [MailModule], // @Global()，全应用注册一次即可
})
export class AppModule {}
```

注入并发送：

```typescript
import { MailService } from "@vxture/core-mail";
import type { MailPayload } from "@vxture/core-mail";

@Injectable()
export class MyService {
  constructor(private readonly mail: MailService) {}

  async sendWelcome(to: string) {
    await this.mail.send({
      to,
      subject: "欢迎加入 Vxture",
      html: "<p>欢迎！</p>",
      text: "欢迎！",
    });
  }
}
```

---

## API

### MailPayload

```typescript
interface MailPayload {
  to: string | string[]; // 收件人（单个或数组）
  subject: string; // 邮件主题
  html: string; // HTML 正文（优先显示）
  text?: string; // 纯文本降级（可选）
}
```

### MailService.send(payload)

- 发送成功：`Promise<void>` resolve
- 发送失败：抛出原始 Error，由调用方决定是否 swallow
- **SMTP 未配置时**：静默 no-op，仅打印警告日志，不抛出异常 — 确保本地开发和 CI 无需邮件服务即可启动

---

## 环境变量

| 变量          | 必填 | 说明                                          |
| ------------- | ---- | --------------------------------------------- |
| `SMTP_HOST`   | ✅   | 未设置时进入 no-op 模式                       |
| `SMTP_PORT`   | ⚪   | 默认 `465`                                    |
| `SMTP_USER`   | ⚪   | SMTP 认证用户名                               |
| `SMTP_PASS`   | ⚪   | SMTP 认证密码                                 |
| `SMTP_FROM`   | ⚪   | 发件人，默认 `Vxture <noreply@{SMTP_HOST}>`   |
| `SMTP_SECURE` | ⚪   | `false` 关闭 TLS，默认 `true`（465 端口 SSL） |

生产环境使用阿里云 DirectMail，`SMTP_HOST=smtpdm.aliyun.com`，端口 465 SSL。VXTURE_DEPLOY_HOST 中这些变量统一来自 `/srv/vxture/runtime/secrets/platform-mail.env`，只注入实际发送邮件的 BFF。

---

## 与 service-mail 的区别

| 包                     | 层             | 职责                                                |
| ---------------------- | -------------- | --------------------------------------------------- |
| `@vxture/core-mail`    | Infrastructure | 通用 send()，无业务逻辑                             |
| `@vxture/service-mail` | Domain         | 验证码发送 + Redis 限流 + 邮件模板（注册/重置密码） |

当前 `console-bff` 和 `admin-bff` 引用 `core-mail` 发送事务通知；`auth-bff` / `website-bff` 的验证码和密码重置场景由 `service-mail` 处理。
