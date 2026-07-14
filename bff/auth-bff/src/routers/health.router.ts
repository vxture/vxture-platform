/**
 * health.router.ts - 健康检查路由
 * @package @vxture/bff-auth
 */

import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthRouter {
  @Get("healthz")
  healthz() {
    return {
      status: "ok",
      service: "auth-bff",
      version: "1.0.0",
    };
  }
}
