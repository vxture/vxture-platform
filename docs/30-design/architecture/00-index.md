# Architecture Documentation Index

**Version**: 1.11.0
**Last Updated**: 2026-05-14
**TypeScript**: 5.9.3
**ECMAScript**: ES2023

## 架构文档（阅读顺序）

### 概览与全局规范

| 文件                       | 内容                                            |
| -------------------------- | ----------------------------------------------- |
| `00-overview.md`           | 平台架构总览 — 层级关系、原则、依赖规则一页总结 |
| `01-monorepo.md`           | Monorepo 结构、工作区配置、各层目录规范         |
| `02-package-boundaries.md` | 各层依赖边界的权威参考                          |

### 层级文档（依赖链由下至上）

| 文件                  | 内容                                  |
| --------------------- | ------------------------------------- |
| `03-core-layer.md`    | Core 层 — 平台基础设施原语            |
| `04-service-layer.md` | Service 层 — 共享域服务与晋升生命周期 |
| `05-bff-layer.md`     | BFF 层 — 认证、聚合、路由、响应塑形   |
| `06-agent-server.md`  | Agent Server 层 — Agent 私有后端架构  |

> Shared / Model Runtime Client / Design System / Platform SDK 的实现约束见 [`docs/40-implementation/packages/`](../../40-implementation/packages/00-index.md)

### 技术选型

| 文件               | 内容                                |
| ------------------ | ----------------------------------- |
| `07-tech-stack.md` | 技术栈选型 — 当前基准版本与升级路径 |

## Coding 规范

见 [`docs/40-implementation/ai/00-index.md`](../../40-implementation/ai/00-index.md) — 注释规范、编码规则、代码风格、TypeScript 配置。

## 能力域设计

见 [`docs/30-design/00-index.md`](../00-index.md) — 跨包能力域端到端设计（Model Platform、控制面、auth、tenant 等）。

## 工程合规审计

见 [`docs/60-operations/audit/00-index.md`](../../60-operations/audit/00-index.md) — 审计规则、CI 门控、检查清单。

## Agent 实例

| 实例    | 前端                        | 后端                        | BFF                        | 状态                                     |
| ------- | --------------------------- | --------------------------- | -------------------------- | ---------------------------------------- |
| ruyin   | `vxture/agentstudio-ruyin`  | `vxture/agentstudio-ruyin`  | `vxture/agentstudio-ruyin` | 已迁出本仓，部署归属 vx-worker-02 业务仓 |
| varda   | agent-studio/varda          | agent-server/varda          | bff/varda-bff              | ✅ 三端运行中（嵌入 admin / console）    |
| agent01 | agent-studio/agent-template | agent-server/agent-template | bff/agent-template-bff     | ✅ 模板（从此分叉新建 Agent）            |

## Changelog

### v1.11.0 — 2026-05-14

- `04-service-layer.md` v1.4.0：新增 §12 Repository 层约束（数据访问隔离规则、领域类型与 Prisma 类型隔离、变更影响面规则）、§13 BFF 响应契约稳定性（契约演进规则、破坏性变更流程）、§14 数据库迁移安全规则

### v1.10.0 — 2026-05-14

- 重新编排文件序号，消除因删除产生的空洞（05→03, 07→04, 10→05, 11→06, 13→07）
- 同步更新所有引用旧序号的文档（30 个文件）

### v1.9.0 — 2026-05-14

- 删除与 `docs/40-implementation/packages/` 完全重复的层级文档：Shared、Model Runtime Client、Design System、Platform SDK 专项文档
- 迁移定位错误的文件：12-typescript → `docs/40-implementation/ai/04-coding-typescript.md`；14-model-platform → `docs/30-design/`；15-control-plane-overview → `docs/30-design/`
- 删除机器生成产物：03-package-graph.json
- `docs/40-implementation/ai/audit/` 提升为 `docs/60-operations/audit/`（工程合规审计，不限于 AI 代码）
- 架构文档从 16 个精简为 8 个，消除维护两处的负担

### v1.8.0 — 2026-05-13

- `00-overview.md` v1.5.0：前端分支移除未实现的 `@vxture/platform-amap`/`platform-cesium`；历史业务前端口径已在 P7b 后改为外部业务仓
- `01-monorepo.md` v1.5.0：历史 Ruyin 曾从 agent-studio 调整到 business 目录；P7b 后 Ruyin 已迁出本仓
- `02-package-boundaries.md`：Platform SDK §9 将 amap/cesium 标注为"计划中，尚未实现"；示例导入改用 browser
- Design System 专项文档：组件数量同步为 25，后续迁移到 `docs/40-implementation/packages/design/design-system.md`
- `09-platform-sdk.md` v1.3.0：完整重写；browser 作为唯一已实现包；amap/cesium 移至"计划中"章节；业务消费者改为外部业务仓口径
- `05-bff-layer.md` v1.4.0→v1.4.1：历史 Ruyin 消费者口径调整；P7b 后 Ruyin 已迁出本仓
- Agent 实例表：Ruyin 改为外部业务仓口径；新增 agent01 模板行

### v1.7.0 — 2026-05-12

- `00-overview.md` v1.4.0：SERVICE LAYER ASCII 框展开为 9 个服务 / 5 个域；CORE LAYER 补充 `@vxture/core-database`；§8 包架构表补全 core-database、platform-browser
- `01-monorepo.md` v1.4.0：仓库结构树补充 auth-bff、gateway-bff；服务树展开至 5 域 9 服务；core 补 database/、mail/；platform 补 browser/；§9/§10 包名与分组列表同步补全
- `02-package-boundaries.md`：Core §3 补充 `@vxture/core-database`、`@vxture/core-mail`；Service §5 展开为 5 域完整树；BFF §6 补充 auth/gateway 及历史业务 BFF
- `03-core-layer.md` v1.4.0：新增 `core-database` 包描述（Prisma DDL 管理，server-side only）；§1 树、§7 用法、§8 消费者表格同步更新
- `04-service-layer.md` v1.3.0：§1 树展开至 5 域 9 服务（新增 ai、identity、notification、tenant 域）；§2 命名示例补全；§3 域分组表扩充
- `05-bff-layer.md` v1.4.0：§1 包树补充 auth-bff、gateway-bff；新增 「auth-bff — 唯一 JWT 签发者」说明章节

### v1.6.0 — 2026-05-11

- `index.md`：Coding 规范章节改为指向 `docs/40-implementation/ai/00-index.md`（原链接 claude-coding-\*.md 已失效）
- `00-overview.md`：删除 §9 依赖规则摘要（指向 02-package-boundaries.md）、精简 §10 Agent 生命周期、website 附录改为指针
- `01-monorepo.md`：删除 §11 依赖方向（指向 02）、§17 AI 开发规范（指向 02）、§18 架构目标、website Appendix A 改为指针
- `03-core-layer.md`：§3 补充 core-auth → core-config 例外说明
- `04-service-layer.md`：§4 补充 `module/` 目录层
- `15-control-plane-overview.md`：容器命名更新为 `vx-*`、删除 §9/§10 Docker Compose/CI-CD（指向 deployment/）

### v1.5.0 — 2026-05-06

- `00-overview.md` v1.3.0：新增「Portal Internal Architecture Notes」附录，记录 website v2.0 Content Registry 系统与路由重构
- `01-monorepo.md` v1.3.0：新增「Appendix A: portals/website Internal Architecture」附录，完整记录 website 路由组、Content Registry、翻译策略、Middleware、内部目录原则
- `index.md` v1.5.0：更新 changelog

### v1.4.0 — 2026-05-03

- 新增 `@vxture/core-mail`：事务邮件包，nodemailer 封装，无 SMTP 时自动 no-op
- `03-core-layer.md` v1.3.0：补充 `core-mail` 包描述、跨依赖约束说明、消费者表格
- `05-bff-layer.md` v1.3.0：新增"事务邮件"章节，记录 Portal BFF fire-and-forget 邮件模式
- `00-overview.md`：ASCII 图和包表格补充 `@vxture/core-mail`
- Agent 实例表补充 Varda（三端运行中，嵌入式部署）

### v1.3.0 — 2026-03-11

- 新增 `07-tech-stack.md`：技术栈选型文档，含当前基准版本与升级路径
- 补充 Agent 实例索引表（ruyin）

### v1.2.0 — 2026-03-10

- 新增 `06-model-runtime-client.md`：Model Runtime Client 模块架构专项文档
- 新增 `09-platform-sdk.md`：Platform SDK 专项文档
- 新增 `05-bff-layer.md`：BFF 层专项文档
- 文档重编号：按依赖链底层→高层排列
  - `06-shared-layer.md` → `04-shared-layer.md`
  - `09-agent-server.md` → `06-agent-server.md`
  - `10-typescript.md` → `12-typescript.md`
- `00-overview.md` Document Map 同步更新

### v1.1.0 — 2026-03-10

- `services/` 引入域分组目录结构：`services/{domain}/{name}/`
- 新增 `commerce` 域：`billing`、`subscription`
- 新增 `support` 域：`ticket`
- 包名保持不变：`@vxture/service-{name}`
- `pnpm-workspace.yaml` 通配符从 `services/*` 更新为 `services/*/*`
