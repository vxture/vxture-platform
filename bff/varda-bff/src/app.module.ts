/**
 * app.module.ts - Varda BFF 根模块
 * @package @vxture/bff-varda
 * @layer Application
 * @category Module
 *
 * @description
 *   中间件执行顺序：AuthMiddleware（JWT 验证 + jti 黑名单）→ SurfaceMiddleware（CallerContext 构造）
 *   中间件只作用于 /varda/* 路由（ChatRouter、ConfirmRouter），/health 不经过中间件。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import {
  AccessTokenRevocationService,
  REDIS_REVOCATION_CONFIG,
} from "@vxture/core-auth";
import { VxConfigModule, VxConfigService } from "@vxture/core-config";
import { AuthMiddleware } from "./middleware/auth.middleware";
import { SurfaceMiddleware } from "./middleware/surface.middleware";
import { ChatRouter } from "./routers/chat.router";
import { ConfirmRouter } from "./routers/confirm.router";
import { HealthRouter } from "./routers/health.router";

@Module({
  imports: [
    VxConfigModule.register({ domains: ["app", "auth", "redis", "platform"] }),
    JwtModule.register({}),
  ],
  controllers: [HealthRouter, ChatRouter, ConfirmRouter],
  providers: [
    {
      provide: REDIS_REVOCATION_CONFIG,
      useFactory: (c: VxConfigService) => c.redis,
      inject: [VxConfigService],
    },
    AccessTokenRevocationService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware, SurfaceMiddleware)
      .forRoutes({ path: "varda/*path", method: RequestMethod.ALL });
  }
}
