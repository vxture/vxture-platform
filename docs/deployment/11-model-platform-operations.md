# Model Platform 运维与观测运行手册

> 更新：2026-06-07
> 范围：平台栈中的 `vx-model-platform` 服务。

容器命名：当前部署与告警脚本只认 `vx-model-platform`。常规部署通过 `30-deploy-platform-stack.sh` 执行 `docker compose up -d --remove-orphans`，用于清理已从 compose 移除的旧服务容器。

---

## 目标

P4 的目标不是新增独立观测服务，而是在当前 `@vxture/service-model-platform` 合并实现内建立生产可用的运维基线：

- 运行状态可检查
- 部署状态可验证
- 故障原因可分类
- 日志可按请求、租户、应用、模型、Provider 关联
- 告警能区分阻塞部署的问题和常态维护问题

P4 对应工作计划版本：

```text
model-platform-v0.5-prod-baseline
```

---

## 当前状态

截至 2026-06-07，P4 本地实现已进入收口阶段：

- 已补 Model Platform liveness / readiness / diagnostics 设计与本地实现。
- 已补 runtime 请求边界和 Provider 调用边界的结构化日志设计与本地实现。
- 已补 `40-verify-platform-runtime.sh` 与 `51-check-platform-alerts.sh` 的 Model Platform readiness 检查设计与本地实现。
- 已替换为 `prom-client` 生产级指标实现；`/metrics` 已注册到服务内，当前访问边界依赖容器内部网络与 Nginx 不代理的部署拓扑。
- 部署服务器侧 E2E 验证仍待人工或 CI/CD 按脚本执行。

本文件是正式运维文档；`.work-in-progress/` 下的 PR 草稿和临时 runbook 不进入提交。

---

## 健康检查分层

| 层级      | 目标                         | 允许检查的内容                                    | 不允许检查的内容                 |
| --------- | ---------------------------- | ------------------------------------------------- | -------------------------------- |
| Liveness  | 证明服务进程可响应           | 进程、HTTP 路由、基本服务状态                     | DB、Provider、runtime secrets    |
| Readiness | 证明服务可以承接模型运行流量 | DB、模型注册表、Provider key 引用、配额、计量写入 | Provider key 明文、prompt 内容   |
| Diagnosis | 辅助定位运行问题             | Provider 健康摘要、错误分类、fallback、延迟       | 用户 prompt、response、secret 值 |

建议 endpoint：

```text
GET /healthz
GET /model-platform/health/live
GET /model-platform/health/ready
GET /model-platform/health/diagnostics
```

`/healthz` 是兼容入口，语义等同于 liveness。`diagnostics` 只允许 Admin BFF 或内部运维链路访问，不应直接暴露公网。

---

## Diagnostics 访问控制

`/model-platform/health/diagnostics` 是运维诊断入口，不是公共健康检查入口。

当前 P4 基线要求：

- 默认不得通过公网入口暴露 diagnostics。
- 只允许 Admin BFF、内部运维链路或受控内网调用。
- 诊断响应不得包含 Provider key 明文、runtime secret 值、用户 prompt 或模型 response。
- 若使用临时 header / env guard，只能作为过渡方案；生产推广前应替换为 BFF token 校验、mTLS 或明确的内网访问控制。

---

## Metrics 访问控制

`/metrics` 只服务于 Prometheus 或同类监控系统，不属于业务 API。

当前 P4 基线要求：

- `/metrics` 已注册到 `ModelPlatformModule`，部署后必须确认容器内可访问。
- 当前 VXTURE_DEPLOY_HOST compose 不暴露 `vx-model-platform` 宿主机端口，Nginx 也不代理 `/metrics`；若未来外部监控需要访问，必须先增加 Nginx / LB / 网络 ACL。
- 禁止将 `/metrics` 暴露给公网匿名访问。
- metrics 标签不得包含 prompt、response、Provider key、secret 值、用户 token、cookie 或 JWT。
- `/metrics` 已完成 `prom-client` 实现，当前为生产可用的指标基线；后续可基于该基线补 Grafana dashboard 与告警规则。

### P5 观测加固补充（已实现）

- 在不引入独立可观测服务前，`/metrics` 与诊断接口共用 `InternalDiagnosticsGuard` 访问边界。
- 建议在生产时配置 `INTERNAL_DIAGNOSTICS_TOKEN`（固定密钥）+ 来源网段白名单 `INTERNAL_DIAGNOSTICS_ALLOW_IPS`。
- `INTERNAL_DIAGNOSTICS_ALLOW_IPS` 支持 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` 及精确 IP 写法；可按实际网络逐步收紧。
- 允许环境变量 `ALLOW_INTERNAL_DIAGNOSTICS=1` 仅用于本地排障临时开启。

## P5 观测阈值（首版）

以 `/model-platform/health/ready` + `/metrics` 联合判断：

- `model_request_errors_total`（provider_error）24h 同比/窗口内错误率上升超过 10%：`MEDIUM`
- `model_request_in_flight` 长时间大于 100 且持续 10 分钟：`MEDIUM`
- `fallback` 率在 5 分钟窗口超过 20%：`MEDIUM`
- readiness 非 `ready`：
  - `blocked` → `HIGH`（建议暂停新流量）
  - `degraded` → `MEDIUM`（允许降级运行但需处理）
- `/metrics` 缺失：`HIGH`（部署后）/`LOW`（常态运行后）视为观测失效

告警动作：

- `HIGH`：第一时间确认服务可写流量与 DB/Quota/Usage 路径；必要时阻断对外模型流量。
- `MEDIUM`：形成 24h 待办，安排窗口处理，避免误杀业务。
- `LOW`：纳入例行运维列表，不影响服务可用性。

### P5 观测加固补充（执行中）

- 在不引入独立可观测服务前，`/metrics` 与诊断接口共用 `InternalDiagnosticsGuard` 访问边界。
- 建议在生产时配置 `INTERNAL_DIAGNOSTICS_TOKEN`（固定密钥）+ 来源网段白名单 `INTERNAL_DIAGNOSTICS_ALLOW_IPS`。
- `INTERNAL_DIAGNOSTICS_ALLOW_IPS` 支持 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` 及精确 IP 写法；可按实际网络逐步收紧。
- 允许环境变量 `ALLOW_INTERNAL_DIAGNOSTICS=1` 仅用于本地排障临时开启。

## P5 观测阈值（首版）

以 `/model-platform/health/ready` + `/metrics` 联合判断：

- `model_request_errors_total`（provider_error）24h 同比/窗口内错误率上升超过 10%：`MEDIUM`
- `model_request_in_flight` 长时间大于 100 且持续 10 分钟：`MEDIUM`
- `fallback` 率在 5 分钟窗口超过 20%：`MEDIUM`
- readiness 非 `ready`：
  - `blocked` → `HIGH`（建议暂停新流量）
  - `degraded` → `MEDIUM`（允许降级运行但需处理）
- `/metrics` 缺失：`HIGH`（部署后）/`LOW`（常态运行后）视为观测失效

告警动作：

- `HIGH`：第一时间确认服务可写流量与 DB/Quota/Usage 路径；必要时阻断对外模型流量。
- `MEDIUM`：形成 24h 待办，安排窗口处理，避免误杀业务。
- `LOW`：纳入例行运维列表，不影响服务可用性。

---

## Readiness 响应结构

建议结构：

```json
{
  "status": "ready",
  "checkedAt": "2026-06-06T00:00:00.000Z",
  "checks": {
    "database": { "status": "pass", "latencyMs": 12 },
    "modelRegistry": { "status": "pass", "activeModels": 5 },
    "providerKeys": {
      "status": "warn",
      "missing": ["ANTHROPIC_API_KEY"]
    },
    "quotaRead": { "status": "pass" },
    "usageWrite": { "status": "pass" }
  }
}
```

状态语义：

| 状态       | 含义                       | 部署动作                       |
| ---------- | -------------------------- | ------------------------------ |
| `ready`    | 核心依赖可用               | 可以继续部署或接入流量         |
| `degraded` | 可响应但存在 Provider 问题 | 可继续但必须告警               |
| `blocked`  | DB / 配额 / 计量核心失败   | 阻塞部署，不应承接模型运行流量 |

---

## 结构化日志字段

Model Runtime 的请求入口、授权检查、配额检查、Provider 调用、fallback、计量写入都应输出结构化日志。

最小字段：

| 字段               | 说明                                                       |
| ------------------ | ---------------------------------------------------------- |
| `request_id`       | 请求关联 ID                                                |
| `tenant_id`        | 租户 ID                                                    |
| `application_id`   | 应用 ID                                                    |
| `application_type` | `agent` / `workflow` / `api_client` / `internal_service`   |
| `model_code`       | 请求模型                                                   |
| `provider_code`    | 实际 Provider                                              |
| `status`           | `success` / `denied` / `quota_exceeded` / `provider_error` |
| `latency_ms`       | 耗时                                                       |
| `error_code`       | 结构化错误码                                               |
| `fallback_attempt` | fallback 序号或 `false`                                    |

禁止写入日志：

- Provider API Key 明文
- runtime secret 值
- 用户 prompt
- 模型 response 内容
- Cookie / JWT / internal token

---

## 部署检查职责

| 检查位置                        | 负责内容                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| CI/CD                           | build、type-check、test、env audit（含 deploy bundle secret scan，warning 作为阻断项） |
| `40-verify-platform-runtime.sh` | 部署后检查容器、网络、端口、health endpoint、runtime env 文件                          |
| `51-check-platform-alerts.sh`   | 常态检查版本、容器、证书、runtime 文件、health、告警分级                               |
| Admin 运维页面                  | 只读展示运行状态，不执行服务器修复                                                     |

服务器侧修复必须保持脚本化，不能直接手工改服务器文件。

当前 P4.2 脚本约定：

- `40-verify-platform-runtime.sh` 调用 `/model-platform/health/live` 和 `/model-platform/health/ready`；readiness 不是 `ready` 时部署验证失败。
- `51-check-platform-alerts.sh` 调用 `/model-platform/health/ready`；`ready` 输出 OK，`degraded` 输出 MEDIUM，`blocked` 或不可达输出 HIGH。
- 脚本只输出 key reference 名称和状态，不输出 secret 值。

### 部署前检查

1. 本地或 CI 执行 `@vxture/service-model-platform` 的 type-check、lint、test。
2. 执行 env audit，确认 deploy bundle 不包含真实 runtime secrets。
3. 确认 `/srv/vxture/runtime` 已由人工或脚本准备好生产参数。
4. 确认 `vx-model-platform` 镜像版本与 deploy bundle 匹配。

### 部署后检查

1. 在部署服务器执行 `bash scripts/40-verify-platform-runtime.sh`。
2. 重点确认 Model Platform liveness 和 readiness。
3. readiness 不是 `ready` 时，不应继续接入模型流量。
4. 输出结果需要保留到发布记录或 PR 备注中。

### 常态巡检

1. 在部署服务器执行 `bash scripts/51-check-platform-alerts.sh`。
2. `HIGH` 需要立即处理或阻断发布。
3. `MEDIUM` 允许继续服务，但必须形成后续处理项。
4. `LOW` 进入常规维护队列。

---

## 告警分级

| Severity | Category      | 示例                                                            | 处理策略               |
| -------- | ------------- | --------------------------------------------------------------- | ---------------------- |
| HIGH     | 服务不可用    | 容器缺失、health 不通、DB 不通、端口不可达                      | 阻塞部署或立即处理     |
| HIGH     | 运行配置缺失  | `.env.model-platform` 缺失、Provider key 引用缺失、模型注册为空 | 不承接模型流量         |
| HIGH     | 计量链路失败  | usage event 写入失败、usage summary 更新失败、quota read 失败   | 告警并暂停相关运行流量 |
| MEDIUM   | Provider 降级 | Provider timeout、Provider 5xx、fallback 频繁                   | 继续服务但告警         |
| MEDIUM   | 用量异常      | Token 突增、拒绝率过高、summary 延迟                            | 运营复核               |
| LOW      | 运维卫生      | 无备份、版本偏离、缺少近期健康样本                              | 纳入维护计划           |

---

## P4 实施顺序

1. 确认本文档、`docs/design/model-platform.md`、`docs/packages/services/model-platform.md`、workplan 的 P4 规划。
2. 实现 service health endpoint 和单元测试。
3. 实现结构化日志字段，不记录敏感内容。
4. 更新部署验证脚本和常态告警脚本。
5. 更新 CI/CD 文档，明确哪些检查自动执行。
6. 如 health API 稳定，再补 Admin 只读运维状态入口。

---

## 故障处理

### Readiness 为 blocked

优先按以下顺序定位：

1. PostgreSQL 是否可达，`vx-platform-pg` 是否健康。
2. Model registry 是否有 active model。
3. Provider key reference 是否存在，但不得打印 key 值。
4. quota read path 是否可读。
5. usage summary / metering path 是否可读写。

### Metrics 为空

优先按以下顺序定位：

1. `MetricsController` 是否已注册到 `ModelPlatformModule`。
2. 容器内 `curl http://localhost:3100/metrics` 是否有输出。
3. Prometheus 或监控系统是否能从允许网络访问。
4. runtime 是否实际产生模型请求。

### 日志出现敏感内容

如果发现日志包含 prompt、response、Provider key、secret、cookie、JWT：

1. 立即暂停相关日志转发或采集。
2. 回滚到上一稳定镜像。
3. 搜索并清理已落盘日志。
4. 修复日志序列化逻辑后重新验证。

---

## 回滚原则

- 代码回滚通过 Git 分支和 CI/CD 执行，不直接修改服务器代码。
- runtime env 和 secrets 不随 deploy bundle 覆盖。
- 如果只是 readiness 阻塞，优先修复 runtime 配置或模型注册，不直接重建数据库。
- 如果涉及日志泄密，优先断开日志采集和回滚镜像。

---

## 非目标

- 不拆分 `@vxture/service-model-observability`
- 不直接引入 Prometheus / Grafana
- 不实现完整成本结算
- 不实现治理审批流
- 不直接修改服务器
