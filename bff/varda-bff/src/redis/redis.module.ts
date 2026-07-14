/**
 * redis.module.ts - Redis 全局模块
 * @package @vxture/bff-varda
 * @layer Application
 * @category Module
 *
 * @description
 *   @Global() 使 RedisService 在整个 varda-bff 中可直接注入，
 *   AuthMiddleware 无需显式导入即可使用。
 *
 * @author AI-Generated
 * @date 2026-05-01
 */

import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
