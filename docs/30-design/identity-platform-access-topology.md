# Identity 接入拓扑：SSO / SLO / 同源 / 跨域 / operator 登录

> 版本：v1.0（2026-06-15）
> 状态：设计（待实施）。从属于权威设计 `docs/30-design/identity-platform-architecture.md`（§3 会话拓扑、§4 认证、§5 iam）；与之冲突以权威设计为准。
> 依据：已建代码实测——`cookie.ts`(vx_sid/vx_sid_op)、`oidc.service`(authorize/endSession/sendBackChannelLogouts)、`iam.oidc_client` schema、`RpSessionStore.destroyBySid`、`OperatorLoginGuard`、accounts `OidcLoginForm`。
> 目的：定死"同登录/同登出"在**同子域**与**跨注册域**的规则，补齐 RP 侧接线与 operator 登录，作为 §13.7 真闭合的前置。

---

## 0. 基本规则（北极星，一句话）

**身份 / SSO / SLO 全部经 IdP（`accounts.vxture.com`）居中；SSO = 顶级重定向到 IdP，SLO = IdP 服务端 back-channel；RP 会话 cookie 永远只留在各自域内，从不跨注册域共享。**

推论：

- 加任何新业务（ruyin.ai / 未来）= 注册一个 `oidc_client` + 该业务 BFF 做 OIDC RP（含 back-channel 接收）+ 该业务**域内** portal↔BFF 同源。**IdP 侧零改动。**
- 同子域（`*.vxture.com`）额外能直接共享 `vx_sid`，但**不依赖**它——重定向到 IdP 的机制对同域、跨域一视同仁。

铁律（避坑）：

- ✅ **redirect-based** authorize（顶级导航，`SameSite=Lax` cookie 可送）+ **back-channel** logout（服务端 POST）。**对现代浏览器唯一可靠的组合。**
- ❌ 禁用 **iframe 静默 SSO**（check_session iframe）与 **front-channel logout**（iframe 逐个加载 RP 登出页）——Safari ITP / Chrome 第三方 cookie 弃用会令其失效。

---

## 1. 三类 cookie（先厘清，别混）

| cookie                           | 谁设         | 域                                   | 作用                                                         |
| -------------------------------- | ------------ | ------------------------------------ | ------------------------------------------------------------ |
| `vx_sid`（tenant 中央会话）      | IdP          | `Domain=.vxture.com`                 | 租户 SSO 的根。浏览器打 IdP `/authorize` 时自动带 → 静默发码 |
| `vx_sid_op`（operator 中央会话） | IdP          | **host-only**（accounts.vxture.com） | operator 中央会话，**硬隔离**，不进租户 SSO                  |
| `vx_rp_session`（RP 会话）       | 各 RP 的 BFF | 各 RP **自己域内**（host-only）      | 单个 app 的登录态；opaque，token 留服务端                    |

要点：**SSO 只靠 IdP 的中央会话；RP 会话各管各的，从不跨域共享。**

---

## 2. 同域名 / 不同子域（`*.vxture.com`）规则

- **中央会话**：`vx_sid` `Domain=.vxture.com` → website/console 等子域打 `accounts.vxture.com/authorize` 时浏览器自动带 = 子域间 SSO 天然成立。
- **RP 会话**：website-bff / console-bff 各自 opaque cookie，host-only 在各自子域。
- **operator**：`vx_sid_op` host-only，admin 不进租户 SSO（双 realm 硬隔离）。
- **同登出**：任一租户 RP 登出 → 调 IdP `/oidc/end_session` → IdP 杀 `vx_sid` + 按 sid 枚举本会话所有 RP 逐个 back-channel POST → 全租户端同登出。

---

## 3. 跨域名（ruyin.ai / 后续业务）设计

### 3.1 SSO 跨域——天然成立，无需任何跨域 cookie

ruyin.ai 只是**又一个 `oidc_client`**。流程：

```text
用户已登 vxture.com（IdP 有 vx_sid）
ruyin.ai 未登 → ruyin-bff 顶级重定向到 accounts.vxture.com/authorize
  此刻 accounts.vxture.com 是第一方 → 浏览器带 vx_sid（Lax 随顶级导航发送）
IdP 见会话 → 静默发授权码 → 回 ruyin-bff/callback → 换 token → 设 ruyin.ai 自己的 vx_rp_session
= ruyin.ai 免凭据登录（SSO）。RP 自己的域名与 SSO 无关。
```

### 3.2 SLO 跨域——靠 back-channel（已建于 IdP）

```text
任一 app 登出 → 调 IdP /oidc/end_session
IdP sendBackChannelLogouts(sid)：按 sid 枚举本会话登过的所有 client（含 ruyin）
  → 读各自 oidc_client.back_channel_logout_uri
  → 签 logout_token（含 sid + backchannel-logout event + aud=clientId + sub）
  → 服务端 POST 给每个 RP 的 back-channel 端点
ruyin-bff 收到 → 验 logout_token → RpSessionStore.destroyBySid(sid) → 销毁本地会话
= 全域同登出。服务端通信，不受第三方 cookie 拦截影响。
```

### 3.3 ruyin.ai 自己的会话

`vx_rp_session` 在 ruyin.ai 域内（host-only），与 vxture.com 无关、也不共享。

---

## 4. 待规划项 A：RP 域内同源拓扑

**问题**：RP 会话 cookie 要工作，且 portal 中间件能读它，**portal 与它的 BFF 必须同源**。现状：`accounts.vxture.com` 已同源（UI + `/oidc`）；但 `console.vxture.com` nginx **没把 `/auth`+`/api` 反代到 console-bff** → RP cookie 与 portal 不同源 → 即使上线也回跳循环。website 同理。

**方案（推荐）**：**逐子域 BFF 同源反代**——每个 portal 子域的 nginx 增加：

```nginx
location /auth/ { proxy_pass http://<that-app-bff>; }   # RP login/callback/session/logout + back-channel
location /api/  { proxy_pass http://<that-app-bff>; }   # 该 app 数据 API（注意与 portal 自身 /api 路由不冲突）
location /      { proxy_pass http://<portal>; }
```

镜像 `accounts.vxture.com` 已有的做法（`/oidc`→auth-bff，`/`→accounts）。**决策点 D-AT**：逐子域反代（推荐，标准 RP 拓扑） vs 经 api gateway + 统一前缀。每个租户 RP（website / console）+ 每个新业务域（ruyin）各做一次。

> 本地等价：portal dev 加 Next rewrite（`/auth/*`+`/api/*`→该 BFF），同源 smoke 用。

---

## 5. 待规划项 B：单点登出（SLO）接线

**IdP 侧已建**：`/oidc/end_session` + `endSession` + `sendBackChannelLogouts`（签发/枚举/POST）+ `oidc_client.back_channel_logout_uri` 列 + discovery 广告 `backchannel_logout_supported`。

**RP 侧待补（每个 RP，含跨域 ruyin）**：

1. **RP 登出改为调 IdP**：当前 RP 登出只本地清（`store.destroy`+clearCookie，console-bff 注释明言"does not end the IdP session"）。改为：本地清 + 重定向/调 IdP `/oidc/end_session`，回跳到**统一中性 post-logout 页**（D-AU）。
2. **RP back-channel 接收端点**（新）：`POST /auth/backchannel-logout`，验 `logout_token`（RS256 经 JWKS、aud=本 client、含 backchannel-logout event、`sid`）→ `RpSessionStore.destroyBySid(sid)`。
3. **注册**：每个 `oidc_client` 填 `back_channel_logout_uri`（指向上面端点）。
4. **统一 post-logout 页（D-AU）**：accounts 上一个中性页，**携带发起 RP 的品牌**（logo/title/文案，登出时传入 client 标识、IdP 从 `oidc_client` 取品牌字段）→ 渲染"已从 [RP] 安全退出"，与登录面携带 RP 信息对称。⇒ `oidc_client` 可能补 `logo_url`/`display_name`；登录面也应一致展示 RP 品牌。

完成后：任一 app 登出 → 全租户/全跨域 RP 同登出 + 落到带 RP 品牌的统一 post-logout 页；operator 因 realm 隔离不受影响。

> **跨域 SLO 可配置（D-AW）**：每个业务（尤其跨域 ruyin）可配是否参与全域 SLO 及参与方式（强制 back-channel / 仅本地 / 不参与）——属后续设计细化，先在 `oidc_client` 预留语义。

---

## 6. 待规划项 D：operator 手机码登录（修订 Batch 8 D-X）

> **状态（D-AV）：方向已确认，预留不实施** —— Batch 16 仅占位，暂不动手；下方为定稿方案，待排期。

**现状**：operator 密码登录**已支持三标识**（`authenticateOperator`：username/email/phone 任一 + 密码）；**无社交登录**（符合要求）；但**纯密码、无手机码**（Batch 8 D-X 当时选 password-only）。

**要求（本次修订）**：operator 登录 = 三标识+密码 **且** 手机验证码并存；不接三方。

**移植 tenant 手机码到 operator realm，但必须不一样**：

1. 🔴 **绝不自动注册**：tenant 手机码"登录即注册"（新手机自动建号）；**operator 手机码只登录已存在运营账号**，未知手机 → 401，**绝不自动创建平台管理员**。
2. **独立验证码 scope**：`operator-auth`（与 tenant 的 `tenant-auth` 隔离，验证码不串用）。
3. **operator Turnstile**：发码走 operator surface（action `operator_auth`、`TurnstileVerifier.fromEnv("admin")`），复用 `OperatorLoginGuard`。
4. **operator 需有已验证手机**：`ops.admin` 须有 phone 记录（seed superadmin 当前是否有需补）。
5. **accounts operator 面加手机 tab**：现 `OidcLoginForm` operator = 纯密码无 phone tab，为 operator realm 放开。
6. **IdP 新方法** `completeOperatorLoginWithPhone` + `/oidc/authorize/login/phone` 支持 operator realm（现 tenant-only）。

---

## 7. 待规划项 C：跨应用 active-org 同步（可后置）

在 console 切组织，website 是否实时跟随。OIDC 下每个 RP 持登录时 active_org 快照，跨 app 实时同步较重。属 tenant→org 改名桶 H 邻域，**MVP 后再议**。

---

## 8. 已建 vs 待建 账本

| 能力                                                                    | IdP 侧                                                   | RP 侧                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| SSO（中央会话 + authorize 静默发码）                                    | ✅ 已建（`vx_sid` `.vxture.com`、同域 SSO Batch 5 验过） | 域内同源拓扑 ❌（A）                     |
| SLO（back-channel 签发/枚举/POST + `back_channel_logout_uri` 列）       | ✅ 已建                                                  | 接收端点 ❌ + 登出调 end_session ❌（B） |
| 跨域接入（oidc_client schema：redirect/post_logout/backchannel/scopes） | ✅ 字段就位                                              | 各业务做 RP + 注册（A+B）                |
| operator 三标识+密码                                                    | ✅ 已建                                                  | accounts 面已有密码 tab                  |
| operator 手机码                                                         | ❌（D）                                                  | operator phone tab ❌（D）               |
| operator 隔离（vx_sid_op host-only）                                    | ✅ 已建                                                  | —                                        |

---

## 9. 接入新业务 checklist（ruyin.ai / 未来）

1. **注册 `oidc_client`**（`iam.oidc_client` 插一行）：`client_id` / `client_secret_hash` / `realm=tenant` / `redirect_uris[]`（`https://<biz>/auth/callback`）/ `post_logout_redirect_uris[]` / `back_channel_logout_uri`（`https://<biz>/auth/backchannel-logout`）/ `allowed_scopes[]`。
2. **该业务 BFF 做 OIDC RP**（`@vxture/core-oidc-rp`）：login 重定向 / callback 换码建会话 / RP `/auth/session` / 登出调 IdP end_session / **back-channel 接收端点**。
3. **该业务域内同源**（A）：portal↔BFF 同源（nginx 反代 `/auth`+`/api`）。
4. **对外契约**：按本文规则重写 `docs/30-design/identity-platform-ruyin-contract.md`（ruyin）/ `-p4-app-integration-contract.md`（通用）。
5. IdP 侧：**零改动**。

---

## 10. 决策记录（已定，2026-06-15）

- **D-AT（同源拓扑）= 逐子域 nginx 反代** ✅：每个 portal 子域 nginx `/auth`+`/api` → 各自 BFF（标准 RP 拓扑）。采纳推荐。
- **D-AU（RP 登出回跳）= 统一中性 post-logout 页（带 RP 品牌）** ✅：登出统一回到 accounts 的**中性 post-logout 页**；该页**携带发起 RP 的品牌信息**（logo / title / 文案），与登录面携带 RP 信息**对称**。需在登出时把 RP 标识传给 IdP（或 IdP 从 `iam.oidc_client` 取品牌字段），post-logout 页据此渲染"已从 [RP] 安全退出"。⇒ `oidc_client` 可能需补品牌字段（logo_url / display_name），登录面也应一致展示 RP 品牌。
- **D-AV（operator 手机码）= 方向确认，但预留不实施** ⏸：修订 Batch 8 D-X 的方向确认（加手机码、禁自动注册、独立 scope `operator-auth`），但**暂不动手**——Batch 16 仅作占位预留。
- **D-AW（跨域时机）= 等 vxture 自有 RP 闭合后单列** ⏸：ruyin 跨域（Batch 17）**预留**，待 console/website RP 闭合后再排。**另：跨域登出方式要做成可选择、可配置**（每业务可配是否参与全域 SLO 及参与方式），属后续设计细化。

---

## 11. 实施批次

详见 `docs/workplan/identity-platform-implementation.md`（Batch 14 同源拓扑 → 15 SLO → 16 operator 手机码 → 17 跨域 ruyin；改名/D-9 顺延）。
