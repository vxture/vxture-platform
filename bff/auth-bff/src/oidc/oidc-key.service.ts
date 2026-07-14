/**
 * oidc-key.service.ts - OIDC asymmetric signing + JWKS
 * @package @vxture/bff-auth
 * @description
 *   RS256 signing for OIDC assets (id_token / access_token) and JWKS publication.
 *   RS256 signing for OIDC assets (id_token / access_token) + JWKS. See
 *   docs/design/identity-platform-idp.md §3/§5.
 *
 *   P0: the active key is loaded from config (OIDC_ACTIVE_KID + OIDC_SIGNING_PRIVATE_KEY).
 *   Rotation (next/active/retiring) and multi-key JWKS read appoidc.signing_keys —
 *   wired once SigningKeyRepository lands (P0-4). When no key is configured the
 *   service stays inert (isReady()===false) so the legacy path is unaffected.
 */

import { Inject, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { VxConfigService } from "@vxture/core-config";
import { createPrivateKey, createPublicKey, randomUUID } from "node:crypto";

/** A signing public key in JWK form (RFC 7517) for the JWKS document. */
export type OidcJwk = {
  kty?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
  kid: string;
  use: "sig";
  alg: string;
};

export interface OidcSignInput {
  /** the single-valued `aud` — the client_id this token is for */
  audience: string;
  /**
   * the `sub` — usr_<account.id> or opr_<admin.id>. Omit entirely for S2S
   * service-mode tokens (product_210 §3.1: "sub: 用户 id(OBO 模式)/缺省") —
   * there is no user to be the subject when no one is behind the call.
   */
  subject?: string;
  /** lifetime in seconds */
  expiresInSec: number;
  /** additional claims (must NOT include iss/aud/sub/exp/iat/jti) */
  claims?: Record<string, unknown>;
  /** explicit jti; generated if omitted */
  jwtid?: string;
}

@Injectable()
export class OidcKeyService {
  private readonly logger = new Logger(OidcKeyService.name);

  private privateKeyPem: string | null = null;
  private publicKeyPem: string | null = null;
  private publicJwk: OidcJwk | null = null;
  private readonly kid: string | null;
  private readonly alg: "RS256" | "ES256";
  private readonly issuer: string;

  constructor(
    @Inject(VxConfigService) private readonly config: VxConfigService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {
    const auth = this.config.auth;
    this.alg = auth.OIDC_ALGORITHM;
    this.issuer = auth.OIDC_ISSUER;
    this.kid = auth.OIDC_ACTIVE_KID ?? null;

    // Accept either a raw PEM or a base64-encoded PEM. The env loader is
    // line-based (no multi-line values), so base64 is the portable form for
    // .env files / secret managers; a literal PEM still works when passed via
    // a real (multi-line-capable) environment variable.
    const rawKey = auth.OIDC_SIGNING_PRIVATE_KEY;
    const pem =
      rawKey && !rawKey.includes("-----BEGIN")
        ? Buffer.from(rawKey, "base64").toString("utf8")
        : rawKey;
    if (this.kid && pem) {
      try {
        const keyObj = createPrivateKey(pem); // validates the PEM
        const publicKeyObj = createPublicKey(keyObj);
        const jwk = publicKeyObj.export({ format: "jwk" }) as object;
        this.privateKeyPem = pem;
        this.publicKeyPem = publicKeyObj
          .export({ format: "pem", type: "spki" })
          .toString();
        this.publicJwk = {
          ...jwk,
          kid: this.kid,
          use: "sig",
          alg: this.alg,
        } as OidcJwk;
        this.logger.log(
          `OIDC signing ready (alg=${this.alg}, kid=${this.kid})`,
        );
      } catch (e) {
        this.logger.error(
          `OIDC signing key load failed: ${(e as Error).message}`,
        );
        this.privateKeyPem = null;
        this.publicJwk = null;
      }
    } else {
      this.logger.warn(
        "OIDC signing not configured (OIDC_ACTIVE_KID / OIDC_SIGNING_PRIVATE_KEY absent); IdP issuance disabled.",
      );
    }
  }

  /** True when an active asymmetric signing key is loaded and OIDC issuance is possible. */
  isReady(): boolean {
    return this.privateKeyPem !== null && this.kid !== null;
  }

  /**
   * Sign an OIDC asset (id_token / access_token) with the active asymmetric key.
   * Sets the `kid` header and the iss/aud/sub/exp/iat/jti claims.
   */
  sign(payload: Record<string, unknown>, input: OidcSignInput): string {
    if (!this.privateKeyPem || !this.kid) {
      throw new Error("OIDC signing key not configured");
    }
    return this.jwt.sign(
      { ...(input.claims ?? {}), ...payload },
      {
        privateKey: this.privateKeyPem,
        algorithm: this.alg,
        keyid: this.kid,
        issuer: this.issuer,
        audience: input.audience,
        // Omit the option entirely (not `subject: undefined`) so no `sub`
        // claim is written — jsonwebtoken's SignOptions type requires a
        // string when the key is present at all.
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        expiresIn: input.expiresInSec,
        jwtid: input.jwtid ?? randomUUID(),
      },
    );
  }

  /**
   * Verify an OIDC asset this IdP issued (e.g. at /userinfo or /revoke). Uses
   * the active public key with the asymmetric algorithm; rejects alg downgrade.
   * Throws on invalid signature / expiry / issuer. RP-side verification is via
   * JWKS, not this method.
   */
  verify(token: string): Record<string, unknown> {
    if (!this.publicKeyPem) {
      throw new Error("OIDC verification key not configured");
    }
    return this.jwt.verify(token, {
      publicKey: this.publicKeyPem,
      algorithms: [this.alg],
      issuer: this.issuer,
    }) as Record<string, unknown>;
  }

  /**
   * JWKS document. P0: the active key from config.
   * Rotation merges appoidc.signing_keys (status active/next/retiring) once
   * SigningKeyRepository is available (P0-4).
   */
  getJwks(): { keys: OidcJwk[] } {
    return { keys: this.publicJwk ? [this.publicJwk] : [] };
  }

  get activeKid(): string | null {
    return this.kid;
  }

  get algorithm(): "RS256" | "ES256" {
    return this.alg;
  }

  get oidcIssuer(): string {
    return this.issuer;
  }
}
