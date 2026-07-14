/**
 * app.module.ts - Varda Server 根模块
 * @package varda-server
 * @layer Application
 * @category Module
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { Module } from "@nestjs/common";
import { VxConfigModule } from "@vxture/core-config";
import { BillingModule } from "@vxture/service-billing";
import { SubscriptionModule } from "@vxture/service-subscription";
import { TicketModule } from "@vxture/service-ticket";
import { AuditModule } from "./audit/audit.module";
import { ChatModule } from "./chat/chat.module";
import { ConfirmModule } from "./confirm/confirm.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ToolsModule } from "./tools/tools.module";

@Module({
  imports: [
    VxConfigModule.register({ domains: ["app", "auth", "varda", "platform"] }),
    BillingModule,
    SubscriptionModule,
    TicketModule,
    PrismaModule,
    AuditModule,
    ToolsModule,
    ChatModule,
    ConfirmModule,
  ],
})
export class AppModule {}
