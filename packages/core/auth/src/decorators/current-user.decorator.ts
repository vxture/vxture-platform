/**
 * current-user.decorator.ts - Extract current user from request context
 * @package @vxture/core-auth
 * @description
 *   Extracts current user information from request context
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "../types/auth.types";

export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
