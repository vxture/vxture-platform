/**
 * confirm.router.ts - POST /varda/confirm 执行确认透传路由
 * @package @vxture/bff-varda
 * @layer Application
 * @category Router
 *
 * @description
 *   接收前端的确认 / 取消请求，将 CallerContext 编码后透传给 agent-server/varda
 *   的 POST /internal/varda/confirm 接口，直接返回 JSON 响应（非 SSE）。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { VxConfigService } from "@vxture/core-config";
import type { VardaRequest } from "../types/chat.types";

// ============================================================================
// DTO
// ============================================================================

interface ConfirmBffRequestDto {
  auditId: string;
  confirmed: boolean;
  sessionId?: string;
}

// ============================================================================
// ConfirmRouter
// ============================================================================

@Controller("varda")
export class ConfirmRouter {
  private readonly vardaServerUrl: string;

  constructor(@Inject(VxConfigService) configService: VxConfigService) {
    this.vardaServerUrl =
      configService.platform.VARDA_SERVER_INTERNAL_URL.trim().replace(
        /\/+$/,
        "",
      );
  }

  @Post("confirm")
  @HttpCode(200)
  async confirm(
    @Req() req: Request,
    @Body() body: ConfirmBffRequestDto,
  ): Promise<unknown> {
    if (!body.auditId || typeof body.auditId !== "string") {
      throw new BadRequestException({
        statusCode: 400,
        code: "BAD_REQUEST",
        message: "auditId is required",
      });
    }
    if (typeof body.confirmed !== "boolean") {
      throw new BadRequestException({
        statusCode: 400,
        code: "BAD_REQUEST",
        message: "confirmed must be boolean",
      });
    }

    const ctx = (req as VardaRequest).callerContext;
    const encoded = Buffer.from(JSON.stringify(ctx)).toString("base64");

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${this.vardaServerUrl}/internal/varda/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Varda-Context": encoded,
        },
        body: JSON.stringify({
          auditId: body.auditId,
          confirmed: body.confirmed,
          sessionId: body.sessionId,
        }),
      });
    } catch {
      throw new HttpException(
        {
          statusCode: 503,
          code: "SERVICE_UNAVAILABLE",
          message: "Upstream service unavailable",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const json = (await upstream.json()) as unknown;

    if (!upstream.ok) {
      throw new BadRequestException(json);
    }

    return json;
  }
}
