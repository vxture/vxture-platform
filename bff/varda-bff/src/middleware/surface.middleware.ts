/**
 * surface.middleware.ts - Surface 校验与 CallerContext 构造中间件
 * @package @vxture/bff-varda
 * @layer Application
 * @category Middleware
 *
 * @description
 *   读取 X-Varda-Surface Header，校验与 JWT userType 的合法组合，
 *   构造 CallerContext 并挂载到 req.callerContext。
 *   Surface 校验逻辑只在本文件，router 不得重复校验。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import {
  ForbiddenException,
  Injectable,
  type NestMiddleware,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ADMIN_TOOLS, CONSOLE_TOOLS } from "../tools/tool-whitelist.const";
import type {
  CallerContext,
  VardaSurface,
  VardaUserType,
} from "../types/caller-context.types";
import type { VardaRequest } from "../types/chat.types";

// ============================================================================
// Surface × userType 合法矩阵（唯一权威定义，与 spec §4.3 保持一致）
// ============================================================================

const VALID_COMBINATIONS: Record<VardaSurface, VardaUserType> = {
  admin: "operator",
  console: "tenant_user",
};

const VALID_SURFACES = new Set<string>(["admin", "console"]);

@Injectable()
export class SurfaceMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const surface = req.headers["x-varda-surface"] as string | undefined;
    const { userType, userId, role, tenantId } = (req as VardaRequest).user;

    if (!surface || !VALID_SURFACES.has(surface)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "SURFACE_FORBIDDEN",
        message: "Missing or invalid X-Varda-Surface header",
      });
    }

    const validUserType = VALID_COMBINATIONS[surface as VardaSurface];
    if (validUserType !== userType) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "SURFACE_FORBIDDEN",
        message: "Surface and userType mismatch",
      });
    }

    const vardaSurface = surface as VardaSurface;

    const callerContext: CallerContext = {
      surface: vardaSurface,
      userId,
      userType,
      role,
      tenantId: tenantId ?? null,
      allowedTools: vardaSurface === "admin" ? ADMIN_TOOLS : CONSOLE_TOOLS,
      dataScope: vardaSurface === "admin" ? "global" : "tenant",
    };

    (req as VardaRequest).callerContext = callerContext;
    next();
  }
}
