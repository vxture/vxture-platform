/**
 * context.guard.ts - CallerContext 解码与二次校验
 * @package varda-server
 * @layer Application
 * @category Guard
 *
 * @description
 *   读取 X-Varda-Context Header，解码 base64 JSON，对 surface × userType 进行
 *   二次校验（防止内部误调用绕过 varda-bff 的 surface.middleware）。
 *   校验通过后将 CallerContext 挂载到 request['callerContext']。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  BadRequestException,
} from "@nestjs/common";
import type { Request } from "express";
import { VALID_COMBINATIONS } from "./caller-context.types";
import type { CallerContext } from "./caller-context.types";

type VardaServerRequest = Request & {
  callerContext?: CallerContext;
};

@Injectable()
export class ContextGuard implements CanActivate {
  canActivate(executionContext: ExecutionContext): boolean {
    const req = executionContext
      .switchToHttp()
      .getRequest<VardaServerRequest>();
    const raw = req.headers["x-varda-context"] as string | undefined;

    if (!raw) {
      throw new BadRequestException("Missing X-Varda-Context header");
    }

    let ctx: CallerContext;
    try {
      ctx = JSON.parse(
        Buffer.from(raw, "base64").toString("utf-8"),
      ) as CallerContext;
    } catch {
      throw new BadRequestException("Invalid X-Varda-Context encoding");
    }

    // 必填字段存在性校验（防止恶意/格式不完整的 Header 导致运行时异常）
    if (
      typeof ctx.userId !== "string" ||
      !ctx.userId.trim() ||
      typeof ctx.role !== "string" ||
      !ctx.role.trim() ||
      !Array.isArray(ctx.allowedTools) ||
      (ctx.dataScope !== "global" && ctx.dataScope !== "tenant")
    ) {
      throw new BadRequestException(
        "CallerContext missing or invalid required fields",
      );
    }

    // surface × userType 合法性二次校验
    if (
      !ctx.surface ||
      !ctx.userType ||
      VALID_COMBINATIONS[ctx.surface] !== ctx.userType
    ) {
      throw new ForbiddenException("CallerContext surface × userType mismatch");
    }

    req.callerContext = ctx;
    return true;
  }
}
