/**
 * roles.decorator.ts - Mark required roles for route
 * @package @vxture/core-auth
 * @description
 *   Marks required roles for a route, used with RolesGuard
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "vx:roles";

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
