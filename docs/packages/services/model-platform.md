# @vxture/service-model-platform

> 能力域设计：[`docs/design/model-platform.md`](../../design/model-platform.md)

---

## 包信息

| 项     | 值                               |
| ------ | -------------------------------- |
| 包名   | `@vxture/service-model-platform` |
| 路径   | `services/model/platform/`       |
| @layer | `Domain`                         |
| 端口   | 3100                             |
| 框架   | NestJS                           |
| 部署   | 平台栈（`vx-model-platform`）    |

## 职责

当前包名为 `@vxture/service-model-platform`，但架构定位是 Model Platform 的早期合并实现。目标能力域拆分为：

```text
model-platform
  ├── model-control-plane   # 配置、授权、策略、配额、价格
  ├── model-runtime         # 调用、路由、Provider adapter、计量
  │   └── model-router      # runtime 内部的模型选择模块
  ├── model-observability   # trace、指标、健康度、告警
  ├── model-metering        # token 计量、成本计算、账单对接
  └── model-governance      # 安全、审计、合规、数据策略
```

当前服务同时承载 model-control-plane 的模型注册 / 授权 / 策略读取能力，以及 model-runtime 的路由调度 / Provider 适配 / 配额检查 / 用量计量能力。所有 agent-server / 业务服务的 LLM 调用必须经过此服务，禁止直接对接 provider API。

当前不拆 `model-observability` / `model-metering` / `model-governance` 独立服务；这些能力先作为目标板块规划。只有当 control-plane / runtime 契约稳定，并且调用量、审计、成本核算复杂度上来后，再按阶段拆分。

部署边界：本服务是平台能力，当前由 `vxture` 仓库部署到 VXTURE_DEPLOY_HOST；未来平台 beta 使用临时 `vxture-beta`，规模化后可迁到独立平台 Model Platform 节点。不得把本服务部署到 vx-worker-02/03/04/05 等业务 worker，业务 worker 只能作为受控 HTTP/API 调用方。

## 目录结构

```
src/
├── runtime/        ← 当前 HTTP 入口与请求编排；目标归属 model-runtime
├── registry/       ← 模型注册表（provider × model）；目标归属 model-control-plane
├── router/         ← model-router 内部模块，负责模型选择与路由策略
├── quota/          ← 配额检查，读取 commerce 有效配额
├── metering/       ← 用量计量与记录，写入 commerce usage facts
├── providers/      ← Provider 适配层（Anthropic / Doubao 等）；目标归属 model-runtime
└── types/          ← 共享类型
```

P3 控制面开发仍在当前合并服务内推进，不新增独立服务：

```text
src/runtime/model-admin.controller.ts  ← /model-platform/admin 控制面 HTTP 入口
src/runtime/model-admin.service.ts     ← provider / model / grant / policy / price 管理编排
```

当前命名保留 `runtime/` 是历史结构，不代表控制面属于 runtime。P3 可以在当前结构内补齐控制面能力，但新增控制面 DTO、查询模型、权限语义必须按 `model-control-plane` 职责命名和记录。

## 依赖约束

```typescript
✅ @vxture/core-* / @vxture/shared
✅ @prisma/client（计量数据持久化）
❌ @vxture/model-runtime-client（运行客户端调用 Model Platform，非反向）
❌ agent-server/* / bff-* / portals/*
```

## 核心约束

- 所有 LLM 调用必须经过 `runtime/` 主逻辑，不可绕过
- Provider 适配层隔离在 `providers/`，禁止在其他模块直接 import Anthropic / Doubao SDK
- 配额超出时返回标准错误，不静默降级
- `model-router` 只是 `model-runtime` 内部模块，不作为整体服务或能力域命名
- `model-control-plane` 负责授权、策略、价格等配置；`model-runtime` 负责实际调用、路由、计量
- 新运行时请求必须使用 `application_id + application_type` 表示应用维度；历史 `agent_id` 只作为 `application_type = agent` 的兼容别名。
- 模型 fallback 通过 `model.model.config.fallbackModelCodes` 配置；runtime 只在 provider 不可用或调用失败时进入 fallback，并且每个候选模型都必须重新通过授权和配额检查。

## P3 Control Plane 规则

P3 已完成并合并到 `develop`。P3 的目标是补齐可运营、可审计、可扩展的控制面，不是拆服务。

实施顺序：

1. 先完善 `@vxture/service-model-platform` 的 `/model-platform/admin` API。
2. 再同步 `bff/admin-bff` 的 `/api/model-platform` 平台级代理和权限校验。
3. 再同步 `bff/console-bff` 的 `/api/model-platform` 租户级代理和权限校验。
4. 最后更新 Admin / Console portal UI。

权限边界：

- Admin BFF 可以访问平台级 provider / model / grant / policy / price 管理能力。
- Console BFF 只能访问当前租户可见模型、授权状态、配额状态、用量摘要，以及明确允许的租户级应用设置。
- Console BFF 不得暴露跨租户数据、provider key、平台成本价、平台级 provider 配置。
- Provider Key 只能以运行环境或未来加密 key-store 引用存在；控制面 API 只允许返回 key 引用状态，不返回明文。

验收重点：

- 控制面写接口必须有明确 DTO 和结构化错误。
- BFF 入口必须显式做权限校验，不依赖前端隐藏按钮。
- Portal 不直接 import service 包，只通过 BFF HTTP 调用。
- Runtime P2 主链路不因控制面变更而回退。

## P4 Observability And Operations 规则

P4 的目标是把当前合并服务推进到可部署验证、可诊断、可告警的生产基线。P4 仍不拆独立 `model-observability` 服务。

实施顺序：

1. 先确认健康检查、结构化日志、部署检查和告警分级文档。
2. 再实现 `@vxture/service-model-platform` 的 liveness / readiness API。
3. 再补运行时请求边界和 Provider 调用边界的结构化日志。
4. 再更新 部署验证脚本和常态告警脚本。
5. 最后按需增加 Admin 只读运维状态入口。

健康检查边界：

- Liveness 只证明进程可响应，不访问 DB、Provider 或 runtime secrets。
- Readiness 必须检查 DB、模型注册表、Provider key reference、quota read path、usage write path。
- Readiness 可返回 degraded 状态，但不得返回任何 provider key 值、runtime secret 值、prompt 或 response 内容。

当前 P4.1 endpoint：

```text
GET /healthz
GET /model-platform/health/live
GET /model-platform/health/ready
GET /model-platform/health/diagnostics
GET /metrics
```

`/healthz` 保留为兼容入口，语义等同于 liveness。
`/metrics` 只作为内部监控抓取入口；当前 VXTURE_DEPLOY_HOST 不通过 Nginx 暴露该路径。

结构化日志字段：

| 字段               | 说明                                                       |
| ------------------ | ---------------------------------------------------------- |
| `request_id`       | 请求关联 ID；由调用方提供或服务端生成                      |
| `tenant_id`        | 租户 ID                                                    |
| `application_id`   | 应用 ID；缺省时使用 runtime sentinel                       |
| `application_type` | `agent` / `workflow` / `api_client` / `internal_service`   |
| `model_code`       | 请求模型                                                   |
| `provider_code`    | 实际 Provider                                              |
| `status`           | `success` / `denied` / `quota_exceeded` / `provider_error` |
| `latency_ms`       | 运行时或 Provider 调用耗时                                 |
| `error_code`       | 结构化错误码                                               |
| `fallback_attempt` | fallback 序号或布尔状态                                    |

当前 P4.4 日志约定：

- `runtime.service.ts` 在请求开始、Provider 调用开始、Provider 失败、请求成功、请求失败时输出 JSON 字符串日志。
- 日志只包含请求关联、租户、应用、模型、Provider、状态、耗时、错误码、fallback 序号、token 数量。
- 日志不包含 prompt、response、Provider key 值、runtime secret 值。

部署检查边界：

- CI/CD 检查 deploy bundle 不含 runtime secrets。
- 服务器脚本检查 `.env.model-platform`、容器、Docker network、端口、health endpoint。
- 常态告警脚本输出 HIGH / MEDIUM / LOW 分级，不直接修复服务器状态。
- 所有服务器侧修复仍需脚本化并由人工或 CI/CD 确认执行。
- `/metrics` 当前为轻量 scaffold，生产化后建议替换为 `prom-client` 并接入 Prometheus / Grafana。

## P5 Production Observability Hardening

P4 scaffold 完成后，下一阶段目标是把可观测性落到生产可维护程度。

- 用标准指标体系替换轻量实现：
  - `request_total`
  - `request_errors_total`
  - `request_duration_ms`（直方图）
  - `tokens_total`
  - `fallback_count`
  - `quota_denied_total`
  - `usage_write_fail_total`
- 定义标签约束：仅保留请求级和运行时排障字段，不引入 prompt、response、provider key、runtime secret、token 明文内容。
- 在部署文档中明确 `/metrics` 的抓取路径、ACL、与 Prometheus/Grafana 的绑定与刷新策略。
- 引入基础告警阈值：
  - 1 小时异常错误率
  - p95 延迟上升
  - fallback 率
  - 配额拒绝率
  - usage 写入失败率
- 维持服务边界：不新增独立服务；P5 仍在 `@vxture/service-model-platform` 与部署运维脚本链路内完成。
