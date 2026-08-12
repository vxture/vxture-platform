import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from "@nestjs/common";
import { OperatorAuthzService } from "./auth/operator-authz.service";
import { OperatorAuthMiddleware } from "./middleware/operator-auth.middleware";
import { OidcRpModule } from "./oidc/oidc-rp.module";
import { OperaBffPoolsModule } from "./providers/pools.module";
import { AtlasRouter } from "./routers/atlas.router";
import { AuditLogViewRouter } from "./routers/audit-log-view.router";
import { HealthRouter } from "./routers/health.router";
import { JobSchedulerRouter } from "./routers/job-scheduler.router";
import { MaintenanceWindowsRouter } from "./routers/maintenance-windows.router";
import { OidcClientRouter } from "./routers/oidc-client.router";
import { ProductCatalogRouter } from "./routers/product-catalog.router";
import { ProductHealthRouter } from "./routers/product-health.router";
import { RunosRouter } from "./routers/runos.router";
import { SessionRouter } from "./routers/session.router";

@Module({
  imports: [OidcRpModule, OperaBffPoolsModule],
  controllers: [
    HealthRouter,
    SessionRouter,
    MaintenanceWindowsRouter,
    ProductHealthRouter,
    JobSchedulerRouter,
    AtlasRouter,
    RunosRouter,
    ProductCatalogRouter,
    OidcClientRouter,
    AuditLogViewRouter,
  ],
  providers: [OperatorAuthzService, OperatorAuthMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 只挂 /api/*：`/auth/*` 是登录出入口（挂上去等于把自己锁在门外），
    // `/health` 要在无会话时也能答，给探针用。
    consumer.apply(OperatorAuthMiddleware).forRoutes("api/*");
  }
}
