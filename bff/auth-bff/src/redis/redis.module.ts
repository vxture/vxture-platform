/**
 * redis.module.ts - Redis 全局模块
 * @package @vxture/bff-auth
 */

import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
