## 数据架构的修正和检查：我直连数据库：platform main，发现schema 跟我们的设计不一致，是不是残留schema和表，没有处理？

access
account
admin
appoidc
billing
commerce
credential
identity
kyc
loyalty
metering
model
product
promotion
provisioning
public
safety
session
support
tenancy

问题1：现在重建落地的数据库，schema 检查是否与设计一致，有没有偏差。
问题2：平台初始化数据的设计，尤其admin域，roles，permission。两个初始化管理员。

### 预置角色(7 个,is_system = true)

| role_code     | 名称       | 定位                                            | mfa_min_level |
| ------------- | ---------- | ----------------------------------------------- | ------------- |
| `super_admin` | 超级管理员 | 唯一能管 operator 账号/角色/安全设置的角色      | `totp`        |
| `admin`       | 平台管理员 | 全业务域管理,但**不含** operator 管理和安全密钥 | `totp`        |
| `operation`   | 平台运营   | 租户/套餐/内容/增长侧                           | `totp`        |
| `finance`     | 财务管理   | 订阅、订单、退款、发票、收入报表                | `totp`        |
| `tech_ops`    | 技术运维   | 模型供给、发布、维护窗口、系统设置              | `totp`        |
| `support`     | 客服       | 工单、租户查询(脱敏)、通知发送                  | `optional`    |
| `auditor`     | 审计       | 全域只读 + 审计日志,零写权限                    | `totp`        |

这个里面缺少了rank，也只是一个侧面的分析和设计，你需要更大维度分析和综合设计。

我设计了两个管理员，system（初始化数据的归属 创建者 actor），便于审计和展示。 这个是否需要分配roles
superadmin，是真正的第一个初始化超级管理员（由system创建 == seed/或脚本创建的） roles = super_admin

## 权限问题

### 权限域矩阵(对齐你的 schema 边界)

权限域按你现有 schema 切,`perm_code`建议`{domain}:{resource}.{action}` 三段式。✔=管理,R=只读,危=高危权限点:

| 权限域(对应 schema)                                     | admin | operation | finance | sre | support | auditor |
| ------------------------------------------------------- | ----- | --------- | ------- | --- | ------- | ------- |
| `tenant:*` 租户档案/认证审核(tenancy)                   | ✔     | ✔         | R       | R   | R       | R       |
| `tenant:suspend`封停/关闭**危**                         | ✔     | —         | —       | —   | —       | —       |
| `tenant:quota.manage` 配额调整(tenant_quota/sub_custom) | ✔     | ✔         | R       | R   | —       | R       |
| `user:read` 用户查询(identity,脱敏)                     | ✔     | ✔         | R       | —   | ✔       | R       |
| `user:read_pii`明文 PII**危**                           | ✔     | —         | —       | —   | —       | —       |
| `commerce:subscription/order.read`                      | ✔     | R         | ✔       | —   | R       | R       |
| `commerce:refund.execute`退款**危**                     | ✔     | —         | ✔       | —   | —       | —       |
| `product:plan/price.manage` 套餐与定价                  | ✔     | ✔         | R       | —   | —       | R       |
| `model:provider/model.manage`(model)                    | ✔     | R         | —       | ✔   | —       | R       |
| `release:feature_flag/maintenance.manage`(ops)          | ✔     | R         | —       | ✔   | —       | R       |
| `content:announcement.manage` 公告                      | ✔     | ✔         | —       | R   | —       | R       |
| `support:ticket.manage`(support)                        | ✔     | R         | —       | —   | ✔       | R       |
| `support:impersonate`代客操作**危**                     | ✔     | —         | —       | —   | —       | —       |
| `security:signing_key/oidc_client.manage`**危**         | —     | —         | —       | —   | —       | —       |
| `operator:account/role.manage`**危**                    | —     | —         | —       | —   | —       | —       |
| `audit:read` 审计日志                                   | ✔     | —         | —       | —   | —       | ✔       |
