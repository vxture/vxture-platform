# 平台功能优化 backlog（登记待启动项）

> 登记 owner 提出、已定方向但尚未排期的功能优化。启动时按 [文档驱动实施闭环] 先出设计再动手；本文件只记意图与衔接点，不做设计。

## FB-001 用户来源 / 邀请码（邀请人）/ 注册意图 + 推广奖励

- **登记**：2026-07-06（owner，首用户注册链路稽查时提出）
- **意图**：注册链路捕获用户来源与意图；支持邀请码归因（邀请人）；推广邀请可得奖励——**奖励形态待定，暂定为 代金券/展期券 + 积分，可复合**。
- **现状衔接点**（结构已就绪的部分）：
  - `account.users.source` 列已存在（来源标记位）；
  - 奖励侧 `promotion.voucher_batches/vouchers/voucher_redemptions` 五 kind 体系已建（含 discount/extension 类），积分侧 `loyalty.user_points` + 流水表已建——奖励发放 = 现有两域的组合调用，无需新域；
  - 归因侧缺口：邀请码实体（码本体/归属人/使用记录）无表，属新增设计；
  - 落点：注册编排收口在 `bff/auth-bff/src/authn/user-onboarding.service.ts`（用户创建后续动作唯一归集点，扩展位已预留注释）。
- **待设计**：邀请码实体与生命周期、归因规则（首触/末触）、奖励规则引擎（复合发放/防刷）、运营配置面。
- **owner 补充（2026-07-06，首用户核验）**：`account.users.source` 暂留空（首用户 feishu 登录时 source=NULL）。**"注册渠道" 与 "邀请来源" 是两个独立维度，须区分并各自保留**：注册渠道 = 用户从哪个入口/方式注册（feishu/dingtalk/password/phone/…）；邀请来源 = 谁邀请的（邀请人/邀请码）。设计时不要把二者塞进同一个 `source` 字段。

## FB-002 认证标签三态 UI（已实名认证 > 手机已验证 > 未认证）

- **登记**：2026-07-06（owner，首用户"已认证"语义澄清）· **设计稿已出** → [`console/verification-badge-design.md`](./console/10-verification-badge-design.md)
- **意图**：用户名后标签(tag)**只有三态**：`已实名认证`（KYC 通过）> `手机已验证`（phone_verified_at 有值）> `未认证`。**不关联邮箱**。UI 载体 = **用户名后 tag**（owner 澄清:当前"已认证"是名后标签,非徽章;徽章暂未放认证态）。
- **设计要点**（详见设计稿）：后端派生枚举 `verificationTier: real_name|phone_verified|none`(纯读 kyc+phone,无 schema 改动);前端标签按枚举渲染。**顺带暴露两个既有问题**(归 FB-005):①等级名前后端分叉(DB `Starter/Bronze/…` vs 前端硬编码 `普通用户/认证用户/…`);②等级 2 硬编码名"认证用户"与认证语义撞车,建议避开"认证"字样。
- **状态**：设计稿 v0.1 待 owner 审 → 审定后进实现(无 DDL 变更,不需 reset 窗口)。

## FB-003 成长积分：登录 / 在线时长积分项

- **登记**：2026-07-06（owner，首用户核验时提出）
- **意图**：把用户活跃转为积分（`loyalty.user_points` + 流水）。**本轮只覆盖 登录 + 在线两类**;邀请/被邀请等是**其他积分类型**,不在本轮(归 FB-001 奖励线)。owner 拟规则（**待设计细化**）：
  - **登录积分**：登录一次 = **5 分**。
  - **在线时长积分**：在线满 1 小时 = **1 分**；不满 1 小时但超过 30min，**按 1 小时**计（30min 进位）。
  - **计次口径**：以"一次完整 登入→登出（主动或被动）"作为一次计量单元。
- **间隔门控（owner 定案 2026-07-06）**：**按自然日 1 天 1 次**——每个用户每自然日最多得一次登录积分(5 分),与 session TTL **解耦**(owner 否决了绑 idle/abs 两案,嫌都不合适)。实现 = 计分前查该用户当日是否已有登录积分流水,有则跳过。
  - 口径待细化:自然日(按平台时区 00:00 切) vs 滚动 24h;建议自然日(直观、防跨日刷)。
- **开放问题（设计需解）**：① 自然日 vs 滚动 24h(建议自然日);② **自动续期**(token idle 刷新)不算新登录(只有过期后重走登录流程才计,但因改按日计,此点弱化);③ 在线时长如何度量(心跳/会话活跃事件 vs 登入登出时间差);④ 在线时长防刷与结算频率(实时 vs 批量 rollup);⑤ 在线时长同样考虑按日封顶?(防挂机刷分)。
- **现状衔接点**：`loyalty.user_points`（余额）+ 积分流水表已建；`session.login_attempts`（登录事件,见 TD-025 IP 补齐）可作登录积分触发源;在线时长需新的会话时长度量源(现无);session TTL 常量在 `packages/core/config/src/schemas/auth.schema.ts`。**先设计后落地**。

## FB-004 profile.language 三方获取 + "跟随系统" 默认（不为空）

- **登记**：2026-07-06（owner，首用户 `user_profiles.language=NULL`）
- **意图**：`user_profiles.language` **不允许为空**。多语言增加 **"跟随系统"** 选项——**未从三方获取、也未用户主动设置的,一律 "跟随系统"**（而非 NULL）。
- **两部分**：① 社交登录时**尽量从三方渠道（feishu/dingtalk locale）获取并填写** language；② 取不到 / 用户没设 → 落 **"跟随系统"** 哨兵值（如 `follow_system`）。
- **落点**：`user-onboarding.service` / 社交 profile 映射读三方 locale；DDL `user_profiles.language` 默认改 `follow_system`（结构改动，随下次 schema 窗口 reset 激活）；前端语言设置项加"跟随系统"。**注**：这是小改动但涉及 DDL 默认值，建议**批量进下一个 schema 窗口**，不单独开 reset。

## FB-005 成长等级名入库可配置 + 前端接 DB（修硬编码 bug）

- **登记**：2026-07-06（owner，FB-002 设计时暴露的等级名前后端分叉）
- **bug**：前端 `TemplateHeader.USER_LEVELS` **硬编码** `普通用户/认证用户/…`，根本没读 DB `loyalty.level_policies.level_name`（现 seed 值 `Starter/Bronze/…`）——两套名并存且前端无视 DB。且等级 2 旧名"认证用户"与认证标签(FB-002)语义撞车。
- **owner 定名（2026-07-06，中英双语，入库可配置）**：

  | level_no | 中文     | English        |
  | -------- | -------- | -------------- |
  | 1        | 新锐同途 | New Pioneer    |
  | 2        | 卓识同行 | Vision Partner |
  | 3        | 鸿途名士 | Grand Elite    |
  | 4        | 思远尊阶 | Sage Noble     |
  | 5        | 凌云首席 | Global Chief   |

- **落点**：① seed `loyalty.level_policies.level_name` 改这五个中文名 + `level_name_key='loyalty.level.{n}'`(已有列)；中英双语进 console locale 文件(`loyalty.level.1` zh=新锐同途/en=New Pioneer …)；② **前端修 bug**：`TemplateHeader.USER_LEVELS` 去硬编码，改读 `level_name_key`(i18n)/`level_name`(fallback) 从 DB/session 来；③ 图标映射可保留在前端(纯展示,与名解耦)。
- **激活**：seed 值改动——loyalty seed 现为 `on conflict do nothing`,须么改 upsert 更新、么随下次 reset 窗口生效。**前端修 bug(读 DB)可独立先上**,不依赖 seed 改动(读到什么显示什么)。**建议**:前端 bug 修复本轮可做;等级名 seed 值随 FB-004 的下次 schema 窗口一起激活。

## FB-006 session TTL 策略调整（analysis + 提案，待 owner 拍数字）

- **登记**：2026-07-06（owner，"运营会话较短时间就重登，8h 是否生效"）
- **分析（现状生效值,worker-01 实测）**：

  | realm         | idle（不活动即登出） | abs（会话最长命） | 来源        |
  | ------------- | -------------------- | ----------------- | ----------- |
  | 运营 operator | **30min**(1800)      | 8h(28800)         | env 显式设  |
  | 客户 customer | 4h(14400)            | **7d**(604800)    | schema 默认 |
  - **owner 困惑澄清**：运营"短时间没动就重登"= **30min idle** 在起作用,不是 8h;**8h abs 确实生效**(会话最长上限),只是几乎撑不到(30min idle 先踢)。两个 TTL 都正常。

- **定案（owner 2026-07-06）**：运营 idle 30min / abs **8h 保持**（满足一天工作时间，高权限 idle 短是安全特性）；客户 idle 4h 保持 / abs 7d→**1d(86400s)**（收紧长尾会话，满足一天）。**唯一改动 = 客户 `OIDC_SESSION_ABS_TTL` 604800→86400**。
- **落地（已实施，env 驱动 — 修正 2026-07-06）**：会话时间**由 `.env.auth-bff` 配置,不硬编码**。worker-01 `.env.auth-bff` 显式加 `OIDC_SESSION_IDLE_TTL=14400`+`OIDC_SESSION_ABS_TTL=86400`(与运营 `OPERATOR_SESSION_*` 同模式),recreate auth-bff 生效(实测 printenv=86400)。`auth.schema.ts` 默认保持 604800 作**通用兜底**(不焊策略值);`.env.auth-bff.example` 明写两行。以后调会话时间 = 改 env + 重建,不碰代码。**教训**:初版误改了 schema `.default()`(=硬编码策略),已回滚。
