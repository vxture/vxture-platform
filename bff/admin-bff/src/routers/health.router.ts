/**
 * health.router.ts - 健康检查路由
 * @package @vxture/bff-admin
 *
 * @description 暴露 GET /healthz 端点供监控系统探测服务存活状态。
 *              该端点不挂载任何 middleware（auth / tenant / permission
 *              均绑定在 api/* 路径下），无需携带认证凭据即可访问。
 *
 * @author AI-Generated
 * @date 2026-04-24
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Application
 * @category Router
 */

import { Controller, Get } from "@nestjs/common";

// ─── 响应体类型 ────────────────────────────────────────────────────────────────

/** 健康检查响应结构 */
interface HealthCheckResult {
  /** 服务状态，始终为 'ok' */
  status: "ok";
  /** 服务标识 */
  service: "admin-bff";
  /** 响应时间戳（ISO 8601） */
  timestamp: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller()
export class HealthRouter {
  /**
   * GET /healthz
   * 返回服务存活状态，供 Docker HEALTHCHECK / K8s liveness probe / 监控面板使用。
   * 不经过任何 auth / tenant / permission middleware。
   */
  @Get("healthz")
  check(): HealthCheckResult {
    return {
      status: "ok",
      service: "admin-bff",
      timestamp: new Date().toISOString(),
    };
  }
}
