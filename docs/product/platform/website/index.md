# Website 营销站点产品规格

> 版本：1.0.0 | 更新：2026-05-11
> 技术实现：[`docs/packages/portals/website.md`](../../../packages/portals/website.md)
> BFF：[`docs/packages/bff/website.md`](../../../packages/bff/website.md)

---

## 定位

Website（`vxture.com`）是 Vxture 平台的**公开门户**，承担两个职责：

| 职责     | 说明                                               |
| -------- | -------------------------------------------------- |
| 营销站点 | 向潜在客户展示产品、方案、案例、定价，驱动注册转化 |
| 认证入口 | 所有租户账号的登录、注册、租户初始化、密码重置     |

Website 是租户用户进入 console.vxture.com 的唯一入口，认证后跳转至 Console。

---

## 页面功能清单

### 营销页（公开，无需登录）

| 路由                  | 页面                                            | 状态      |
| --------------------- | ----------------------------------------------- | --------- |
| `/`                   | 主页（Hero / 功能 / 解决方案 / 客户案例 / CTA） | ✅ 已完成 |
| `/products`           | 产品能力介绍                                    | ✅ 已完成 |
| `/appcenter`          | 应用中心                                        | ✅ 已完成 |
| `/cases`              | 客户案例列表                                    | ✅ 已完成 |
| `/cases/[slug]`       | 案例详情                                        | ✅ 已完成 |
| `/about` / `/company` | 关于我们 / 公司介绍                             | ✅ 已完成 |

### 内容页（Content Registry 统一接管）

| 路由              | 内容类型                        | 状态            |
| ----------------- | ------------------------------- | --------------- |
| `/legal`          | 法律政策索引                    | ✅ 已完成       |
| `/legal/[policy]` | 单项政策详情（隐私/服务协议等） | ✅ 已完成       |
| `/blog`           | 博客列表                        | ⚠️ stub（占位） |
| `/faq`            | 常见问题                        | ⚠️ stub（占位） |
| `/support`        | 支持中心                        | ⚠️ stub（占位） |

新增内容区段扩展三步：`types.ts` 追加 key → 实现 Loader → `registry.ts` 注册。

### 认证页（`(auth)` 路由组，无 Header/Footer）

| 路由               | 功能                                    | 状态                         |
| ------------------ | --------------------------------------- | ---------------------------- |
| `/signin`          | 邮箱密码登录 + 社交登录入口             | ✅ 已完成（社交登录为 stub） |
| `/signup`          | 注册新账号 + 邮箱验证码                 | ✅ 已完成                    |
| `/verify`          | 选择租户类型（个人 / 企业）并初始化租户 | ✅ 已完成                    |
| `/forgot-password` | 发送密码重置邮件                        | ✅ 已完成                    |
| `/reset-password`  | 使用 token 重置密码                     | ✅ 已完成                    |

---

## 认证流程

```
注册：signup → 邮箱验证码 → verify（选择租户类型）→ 跳转 console
登录：signin → JWT cookie → 跳转 console（或目标页）
重置：forgot-password → 邮件发送重置链接 → reset-password → 重新登录
第三方：[钉钉/飞书/企业微信 OAuth] → callback → 自动创建个人租户 → console
```

第三方登录当前为 UI stub，OAuth 接入待完成（T08）。

---

## 关键设计决策

**Header/Footer 唯一实例**：在 `(public)/layout.tsx` 挂载，跨营销页导航不重新挂载。

**Content Registry**：所有内容类页面通过 `(content)/[...slug]` 通配路由统一分发，路由层与数据源解耦，避免为每类内容单独创建路由文件。

**结构数据与翻译分离**：`data/` 只存 href / 图片路径 / i18n key，文本全部在 `messages/` 翻译文件中。

**Store 只存 UI 状态**：`auth.store` 存 `{user, isAuthenticated}`，不存 token。Token 在 Cookie 中，由 Middleware 读取。

**Middleware 三关注点**（固定顺序）：认证重定向 → intl（next-intl 语言前缀）→ `x-pathname` header。

---

## 多语言支持

| 语言    | 状态                      |
| ------- | ------------------------- |
| `zh-CN` | ✅ 主语言，完整翻译       |
| `en-US` | ✅ 已支持，部分页面待补全 |

翻译文件位于 `messages/`，按 namespace 按需加载（home / marketing / legal / cases / common 等）。

---

## BFF 依赖

| 接口                                   | 功能                         |
| -------------------------------------- | ---------------------------- |
| `POST /api/auth/send-code`             | 发送邮箱验证码               |
| `POST /api/auth/verify-code`           | 验证验证码并注册             |
| `POST /api/auth/signin`                | 邮箱密码登录                 |
| `POST /api/auth/signout`               | 登出                         |
| `POST /api/auth/forgot-password`       | 发送重置邮件                 |
| `POST /api/auth/reset-password`        | 重置密码                     |
| `POST /api/auth/tenant/init`           | 初始化租户（注册后选择类型） |
| `POST /api/auth/refresh`               | 刷新 JWT                     |
| `GET /api/auth/oauth/[provider]/start` | 第三方 OAuth 发起（stub）    |
