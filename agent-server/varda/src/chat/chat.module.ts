/**
 * chat.module.ts - 对话模块
 * @package varda-server
 * @layer Application
 * @category Module
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { Module } from "@nestjs/common";
import { MessageRepository } from "../storage/message.repository";
import { SessionRepository } from "../storage/session.repository";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

// ToolRegistry 由 ToolsModule（@Global）提供，无需在此重复声明

@Module({
  controllers: [ChatController],
  providers: [ChatService, SessionRepository, MessageRepository],
})
export class ChatModule {}
