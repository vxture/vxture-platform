/**
 * roles.guard.ts - Role authorization guard
 * @package @vxture/core-auth
 * @description
 *   Works with @Roles() decorator to verify user roles
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "../decorators/roles.decorator";
import { hasRole } from "../utils/permission.utils";
import type { AuthUser } from "../types/auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If @Roles() decorator not set, allow access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User context not found");
    }

    const allowed = hasRole(user, requiredRoles, { mode: "any" });

    if (!allowed) {
      throw new ForbiddenException(
        `Requires role: [${requiredRoles.join(", ")}], current role: ${user.role}`,
      );
    }

    return true;
  }
}
