/**
 * provider.utils.ts - OAuth provider utility functions
 * @package @vxture/core-auth
 * @description
 *   OAuth provider validation, user info standardization, JTI generation, and other utility functions.
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { OAuthProviderType } from "../types/auth.types";
import type { OAuthUserProfile } from "../types/auth.types";

// ============================================================================
// Provider Validation
// ============================================================================

/**
 * Checks if a string is a valid OAuthProviderType
 */
export function isValidProvider(value: string): value is OAuthProviderType {
  return Object.values(OAuthProviderType).includes(value as OAuthProviderType);
}

// ============================================================================
// OAuthUserProfile Standardization Tool
// — Used internally by each provider implementation, unifies output format
// ============================================================================

/**
 * Builds standardized OAuthUserProfile
 * Ensures required fields exist, raw field is fully preserved
 *
 * @example
 * // In DingtalkProvider.getUserInfo()
 * return buildOAuthProfile({
 *   providerId: data.userid,
 *   provider:   OAuthProviderType.DINGTALK,
 *   name:       data.name,
 *   avatar:     data.avatar,
 *   email:      data.email,
 *   raw:        data,
 * });
 */
export function buildOAuthProfile(params: {
  providerId: string;
  provider: OAuthProviderType;
  name: string;
  email?: string;
  avatar?: string;
  raw: Record<string, unknown>;
}): OAuthUserProfile {
  return {
    providerId: params.providerId,
    provider: params.provider,
    name: params.name,
    ...(params.email ? { email: params.email } : {}),
    ...(params.avatar ? { avatar: params.avatar } : {}),
    raw: params.raw,
  };
}

// ============================================================================
// JTI Generation (Refresh Token unique ID for Redis blacklist)
// ============================================================================

/**
 * Generates jti (JWT ID) for refresh token
 * Format: {userId}:{timestamp}:{random}
 * Used for Redis key storage and blacklist comparison
 */
export function generateJti(userId: string): string {
  return `${userId}:${Date.now()}:${crypto.randomUUID().replace(/-/g, "")}`;
}
