/**
 * jwt-auth.guard.ts - JWT authentication guard
 * @package @vxture/core-auth
 * @description
 *   Verifies access token from request, attaches AuthUser to request.user after verification
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";

import { extractBearerTokenFromHeaders } from "../utils/auth.utils";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { JwtAccessPayload, AuthUser } from "../types/auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if marked as @Public(), skip verification
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthUser;
    }>();

    const token = extractBearerTokenFromHeaders(request.headers);

    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }

    try {
      const payload = this.jwtService.verify<JwtAccessPayload>(token);

      // Attach standardized AuthUser to request.user
      request.user = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        role: payload.role,
        ...(payload.userType !== undefined
          ? { userType: payload.userType }
          : {}),
        permissions: payload.permissions ?? [],
        provider: payload.provider,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
