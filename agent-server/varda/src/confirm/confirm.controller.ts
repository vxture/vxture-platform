/**
 * confirm.controller.ts - 执行类工具确认接口
 * @package varda-server
 * @layer Application
 * @category Controller
 *
 * @description
 *   POST /internal/varda/confirm
 *   仅 varda-bff 调用，不对外暴露。
 *   请求体中的 auditId 指向 VardaAuditLog 中挂起的记录；
 *   CallerContext 从 X-Varda-Context 头解码，须通过 ContextGuard 校验。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { ContextGuard } from "../context/context.guard";
import type { CallerContext } from "../context/caller-context.types";
import { ConfirmService } from "./confirm.service";
import type { ConfirmRequestDto } from "./confirm.types";

// ============================================================================
// ConfirmController
// ============================================================================

type VardaServerRequest = Request & { callerContext?: CallerContext };

@Controller("internal/varda/confirm")
@UseGuards(ContextGuard)
export class ConfirmController {
  constructor(private readonly confirmService: ConfirmService) {}

  @Post()
  @HttpCode(200)
  async confirm(@Body() dto: ConfirmRequestDto, @Req() req: Request) {
    const ctx = (req as VardaServerRequest).callerContext;
    if (!ctx) {
      return { success: false, error: "Missing caller context" };
    }
    return this.confirmService.confirm(
      dto.auditId,
      dto.confirmed,
      ctx,
      dto.sessionId,
    );
  }
}
