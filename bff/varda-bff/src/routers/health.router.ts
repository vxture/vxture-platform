/**
 * health.router.ts - 健康检查路由
 * @package @vxture/bff-varda
 * @layer Application
 * @category Router
 *
 * @description GET /health 存活探针（standards 020 + 025）。零依赖，返回统一
 *              身份块（service/version/gitSha/stage/buildTime/time）。
 */

import { Controller, Get } from "@nestjs/common";
import { buildHealthIdentity } from "@vxture/shared";

@Controller("health")
export class HealthRouter {
  @Get()
  check() {
    return buildHealthIdentity({ service: "varda-bff", product: "vxture" });
  }
}
