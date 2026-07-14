/**
 * auth.schema.ts - Authentication configuration schema
 * @package @vxture/core-config
 * @description
 *   Zod schema for authentication (JWT) configuration
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { z } from "zod";

// ============================================================================
// Auth Schema  (JWT + Session)
// ============================================================================

export const authSchema = z.object({
  /** Access token signing secret, must be ≥ 32 random characters in production */
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),

  /** Refresh token signing secret — must differ from JWT_SECRET to prevent cross-token forgery */
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters for security"),

  /** Access token expiration, supports vercel/ms format: 15m, 1h, 7d */
  JWT_ACCESS_EXPIRES_IN: z.string().default("8h"),

  /** Refresh token expiration */
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  /**
   * Refresh token blacklist storage backend
   * redis  — Recommended for production, supports active revocation
   * memory — Only for single-process testing, lost after restart
   */
  JWT_BLACKLIST_STORAGE: z.enum(["redis", "memory"]).default("redis"),

  /** BCRYPT password hash rounds, higher is safer but slower */
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  /**
   * Shared secret for internal service-to-service requests (X-Vxture-Internal-Auth header).
   * Required in production; defaults to a non-secret fallback for local development.
   */
  AUTH_INTERNAL_TOKEN: z.string().min(1).optional(),

  // ── OIDC IdP (P0; coexists with the HS256 path until P5) ──────────────────
  /** OIDC issuer — the public-facing auth origin used as the `iss` claim */
  OIDC_ISSUER: z.string().default("http://localhost:3090"),

  /** Asymmetric signing algorithm for OIDC assets (id_token / access_token) */
  OIDC_ALGORITHM: z.enum(["RS256", "ES256"]).default("RS256"),

  /** Active signing key id (JWT header `kid`); when absent, OIDC issuance is disabled */
  OIDC_ACTIVE_KID: z.string().optional(),

  /**
   * Active signing private key (PEM PKCS8). In production injected via secret manager;
   * public keys / historical kids are tracked in identity.signing_key for rotation.
   */
  OIDC_SIGNING_PRIVATE_KEY: z.string().optional(),

  /** access_token lifetime (seconds) */
  OIDC_ACCESS_TTL: z.coerce.number().int().positive().default(900),

  /** refresh_token lifetime (seconds) */
  OIDC_REFRESH_TTL: z.coerce.number().int().positive().default(2592000),

  /** central session sliding idle TTL (seconds) */
  OIDC_SESSION_IDLE_TTL: z.coerce.number().int().positive().default(14400),

  /** central session absolute max TTL (seconds). Generic fallback default;
   *  the authoritative value is env-driven per deployment (.env.auth-bff) —
   *  FB-006 set worker-01 to 86400 (1d). Do NOT bake policy values here. */
  OIDC_SESSION_ABS_TTL: z.coerce.number().int().positive().default(604800),

  /**
   * Operator central session (vx_sid_op) TTLs — deliberately shorter than the
   * tenant session for the high-privilege control plane (operator-identity-
   * security.md §2.3): idle ≤ 30min, absolute ≤ 8h.
   */
  OPERATOR_SESSION_IDLE_TTL: z.coerce.number().int().positive().default(1800),
  OPERATOR_SESSION_ABS_TTL: z.coerce.number().int().positive().default(28800),

  /**
   * AES-256-GCM key for operator TOTP secrets at rest (admin.operator_mfa.totp_secret).
   * Derived to 32 bytes via SHA-256, so any ≥32-char random secret works. When
   * absent, operator TOTP enrollment/verification is unavailable (fail-closed) —
   * see identity-platform-operator.md §9.
   */
  OPERATOR_TOTP_ENC_KEY: z.string().min(32).optional(),

  // ── operator WebAuthn / Passkey (identity-platform-operator.md §2.1/§9) ────
  /** Relying Party ID = the registrable domain of the operator login surface. */
  OPERATOR_WEBAUTHN_RP_ID: z.string().optional(),
  /** Human-readable Relying Party name shown by the authenticator. */
  OPERATOR_WEBAUTHN_RP_NAME: z.string().default("Vxture"),
  /** Expected ceremony origin (exact scheme+host[+port]) for attestation/assertion. */
  OPERATOR_WEBAUTHN_ORIGIN: z.string().optional(),
});

export type AuthConfig = z.infer<typeof authSchema>;
