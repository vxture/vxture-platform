/**
 * health.router.ts - 健康检查路由
 * @package @vxture/bff-platform-api
 */

import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthRouter {
  @Get("healthz")
  healthz() {
    return {
      status: "ok",
      service: "platform-api",
      version: "1.0.0",
    };
  }
}
