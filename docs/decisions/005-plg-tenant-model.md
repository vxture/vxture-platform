# ADR-005: PLG 自动租户模型

**状态**：✅ Accepted
**日期**：2026-03-01

> 📌 **后记（2026-07-06）**：PLG 自动建租决策继续有效；但本文的"单层租户"语境已被四层稳定模型（User → Tenant → **Workspace** → 两级 Membership）扩展——注册即建 personal tenant + 1 个 default workspace（`data_identity_200_schema.md`），订阅/权益/隔离主体为 workspace（ADR-11），产品分层与共享语义见 ADR-12 + `docs/design/product_110_sharing-isolation.md` v1.0。本 ADR 按惯例不改写，读者以上述文档为现行权威。

---

## 背景

平台面向中小企业和个人开发者。需要决定用户注册和租户创建的策略，即：用户注册后如何进入产品并开始使用？

目标：最小化从"首次访问"到"开始使用产品"的步骤，驱动自助转化。

## 决策选项

### 选项 A：纯企业邀请制

必须由已有管理员邀请，无自助注册路径。

**适用场景**：高安全要求的企业工具（如银行内部系统）。
**缺点**：门槛高，个人用户和中小企业无法自助尝试，需要销售介入，违背 PLG 增长模式。

### 选项 B：自助注册 + 手动创建工作空间

用户可自助注册（Email 或社交登录），但注册后需要手动创建工作空间/团队才能开始使用。

**缺点**：多一步人工操作（"创建工作空间"步骤），对新用户是不必要的摩擦，激活率下降。

### 选项 C：PLG 自动租户（Product-Led Growth）

首次第三方登录（DingTalk / Feishu / WeChat Work / 邮箱注册）时，系统自动创建 Personal Tenant，并为用户分配 Trial Plan。用户直接进入产品，零摩擦。

升级路径：Trial → Pro（个人）或 Trial → Enterprise（邀请团队成员）。

## 决策

采用**选项 C（PLG 自动租户）**。

自动化创建逻辑：

```
首次登录
    │
    ▼
auth-bff 检查 user 的 tenant 列表
    │── 无 tenant → 创建 personal tenant（Trial plan）→ 签发 JWT
    │── 1 个 tenant → 直接签发 JWT（含 tenantId）
    └── 多个 tenant → 返回 tenant 列表 → 用户选择 → 签发 JWT（含所选 tenantId）
```

## 后果

**正面：**

- 最低注册摩擦：首次登录即可使用产品功能
- Trial plan 自动开始计量，数据驱动转化决策
- 用户自然升级路径：继续个人使用 → Pro，或拉同事 → Enterprise
- 用户可同时属于多个 tenant（已实现）：个人 Personal Tenant + 多个企业 Tenant 并存，登录时通过 tenant 选择步骤切换

**负面：**

- auth-bff 登录逻辑变复杂：每次 OAuth 回调需要 check-or-create 操作（数据库写操作在关键路径上）
- 大量 Trial 用户若不活跃，会产生僵尸租户，需要定期清理机制
- 多租户切换增加了登录流程分支：用户属于多个 tenant 时需要额外的 tenant 选择步骤（已实现，但前端需要维护选择 UI）
- 用户删除账号时需要正确处理 tenant 归属（owner 离开 → tenant 归属转移或清理）

---

_决策人：产品 + 架构组 | 实施于：`bff/auth-bff/auth.service.ts`、`@vxture/service-iam`_
