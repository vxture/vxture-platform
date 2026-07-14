/**
 * confirm.module.ts - 执行确认模块
 * @package varda-server
 * @layer Application
 * @category Module
 *
 * @description
 *   AuditRepository 由 AuditModule（@Global）提供，
 *   ToolRegistry 由 ToolsModule（@Global）提供，无需在此重复声明。
 *   MessageRepository 在本模块显式提供（写入确认结果到会话历史）。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { Module } from "@nestjs/common";
import { MessageRepository } from "../storage/message.repository";
import { ConfirmController } from "./confirm.controller";
import { ConfirmService } from "./confirm.service";

@Module({
  controllers: [ConfirmController],
  providers: [ConfirmService, MessageRepository],
})
export class ConfirmModule {}
