# vxtpl_301 — @vxture/shared@1.5.0 已发布：health 切回共享助手 + 偏离纪律提醒

> 编号 `vxtpl_301` · 2026-07-21 · 平台 → vxtpl（模板线 / vxture-template）
> 事由：平台核查 arda 来函时发现 vxtpl health 为自写实现；共享包现已发布，要求切回标准路径，并随函告知新增的偏离纪律。

## 1. 背景与定性

- vxtpl 现行 health 端点**响应字段符合标准 025 契约**（这点予以确认）；
- 但实现是 `@vxture/shared@1.5.0` 未发包时期的**自写/vendor 过渡态**，与
  `docs/10-standards/025-service-health-endpoint-contract.md` "共享助手……**禁止各服务各写一份**"
  条款偏离，且**未申报**——该偏离直到平台侧核查 arda 来函时才后置发现。
- 过渡态本身可以理解（包确实装不到）；问题在**静默**。见 §4 新规。

## 2. 事实：依赖已就绪

- **`@vxture/shared@1.5.0` 已发布** GitHub Packages（tag `latest`，发布 run `29836228522`，构建源
  vxture-platform main = `8f1cd9d8`），含 `serviceIdentity()` / `buildHealthIdentity()` 与
  `ServiceIdentity` / `HealthLiveResponse` 类型；根 barrel 显式导出，CJS/ESM 运行时导出均已实证。

## 3. vxtpl 侧动作（回收此偏离）

1. `package.json`：`"@vxture/shared": "^1.5.0"` → `pnpm install`；
2. health 端点改为 `import { buildHealthIdentity } from "@vxture/shared"`，**删除本地自写的
   identity 组装拷贝**；
3. 佐证字段 ENV 注入（`APP_VERSION` / `GIT_SHA` / `BUILD_TIME` / `DEPLOY_STAGE`）参照
   vxture-platform `deploy/docker/Dockerfile.nestjs` / `Dockerfile.nextjs`（#108 已带注入段）；
   缺省落诚实兜底，禁止硬编码；
4. 回收完成后在贵仓 TD/偏离登记处销号并回报平台。

## 4. 新规：偏离纪律（org 级，随函生效）

`docs/10-standards/140-repo-governance-standard.md` 执行模型段已增**偏离纪律**：标准条款因前置依赖
未就绪而暂不可满足时，不得静默自行发挥——必须 ① 实现处标注偏离+原因（注释引用条款）② 本仓 TD 记名
（条款/原因/回收条件）③ 回报平台确认。**静默偏离 = 未达标**（整顿验收不通过）。§11 检查清单已加对应项。
本函 §1 即该条款的首个实例回收。

## 5. 附注（迁仓包权限）

GitHub Packages 的 per-package Actions 写权限**不随仓库迁移/新仓继承**——自发包前需 owner 在 org
包设置给仓库挂 Write（平台 2026-07-21 发包 403 实测教训）。模板线批 E（CD）落地时留意。

## 6. 联系

平台侧：Stone Smoker。
