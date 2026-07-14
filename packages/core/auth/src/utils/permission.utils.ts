/**
 * permission.utils.ts - Permission and role checking utilities
 * @package @vxture/core-auth
 * @description
 *   Permission checking, role validation, admin judgment, and other utility functions.
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import type { AuthUser, PermissionCheckOptions } from "../types";
import { PlatformRole } from "../types";

// ============================================================================
// Permission Check
// ============================================================================

export function hasPermission(
  user: AuthUser,
  required: string | string[],
  options: PermissionCheckOptions = {},
): boolean {
  const { mode = "any" } = options;
  const list = Array.isArray(required) ? required : [required];
  const userPerms = new Set(user.permissions);

  return mode === "all"
    ? list.every((p) => userPerms.has(p))
    : list.some((p) => userPerms.has(p));
}

// ============================================================================
// Role Check
// ============================================================================

export function hasRole(
  user: AuthUser,
  required: string | string[],
  options: PermissionCheckOptions = {},
): boolean {
  const { mode = "any" } = options;
  const list = Array.isArray(required) ? required : [required];

  return mode === "all"
    ? list.every((r) => r === user.role)
    : list.some((r) => r === user.role);
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === PlatformRole.ADMIN;
}

export function isTenantAdmin(user: AuthUser): boolean {
  return user.role === PlatformRole.TENANT_ADMIN;
}
