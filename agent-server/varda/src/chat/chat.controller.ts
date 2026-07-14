/**
 * chat.controller.ts - POST /internal/varda/chat SSE 流式接口
 * @package varda-server
 * @layer Application
 * @category Controller
 *
 * @description
 *   仅接受来自 varda-bff 的内部调用（通过 ContextGuard 解码并校验 CallerContext）。
 *   响应为 SSE 流（text/event-stream），不缓冲直接回写。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ContextGuard } from "../context/context.guard";
import type { CallerContext } from "../context/caller-context.types";
import { ChatService } from "./chat.service";
import type { ChatInternalRequestDto } from "./chat.types";

type VardaServerRequest = Request & {
  callerContext?: CallerContext;
};

@Controller("internal/varda")
@UseGuards(ContextGuard)
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Post("chat")
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: ChatInternalRequestDto,
  ): Promise<void> {
    const ctx = (req as VardaServerRequest).callerContext;
    if (!ctx) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Missing caller context" })}\n\n`,
      );
      res.end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      for await (const event of this.chatService.chat(
        body.message,
        body.sessionId ?? null,
        ctx,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
