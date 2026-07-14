/**
 * health.router.ts - 健康检查路由
 * @package @vxture/bff-varda
 * @layer Application
 * @category Router
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthRouter {
  @Get()
  check() {
    return { status: "ok", service: "varda-bff" };
  }
}
