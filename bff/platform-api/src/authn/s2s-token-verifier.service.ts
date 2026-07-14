/**
 * s2s-token-verifier.service.ts — JWKS-based verification of IdP-minted S2S
 * bearer tokens (product_210 T1/T2), for the platform-face guard.
 * @package @vxture/bff-platform-api
 *
 * auth-bff's PlatformAuthGuard used to self-verify via OidcKeyService (the
 * IdP's own signing key lives in that process). After the D13 host split the
 * signing PRIVATE key stays confined to auth-bff — this host verifies with the
 * PUBLIC key fetched from the IdP's JWKS over the internal network
 * (`${AUTH_BFF_URL}/oidc/jwks`), kid-cached with one refresh on miss. Modeled
 * on @vxture/core-oidc-rp HttpOidcRpClient.verifyJws (RS256-only, iss + exp
 * checked here; aud is deliberately the consuming guard's job, mirroring
 * OidcKeyService.verify's contract).
 *
 * Only the S2S bearer path depends on this (and thus, lazily, on auth-bff
 * being reachable); the legacy AUTH_INTERNAL_TOKEN header path in the guard
 * has no runtime dependency on the IdP.
 */
import { Inject, Injectable } from "@nestjs/common";
import {
  createPublicKey,
  createVerify,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";
import { VxConfigService } from "@vxture/core-config";

const CLOCK_SKEW_SEC = 60;

interface Jwk {
  kid: string;
  [k: string]: unknown;
}

@Injectable()
export class S2sTokenVerifier {
  private keysByKid = new Map<string, KeyObject>();

  constructor(
    @Inject(VxConfigService) private readonly config: VxConfigService,
  ) {}

  /** Back-channel base for the JWKS fetch: internal IdP URL, never public. */
  private get jwksUri(): string {
    const base = (
      this.config.platform.AUTH_BFF_URL ?? this.config.auth.OIDC_ISSUER
    ).replace(/\/$/, "");
    return `${base}/oidc/jwks`;
  }

  /**
   * Verify a compact JWS (RS256) against the IdP JWKS: signature, iss, exp.
   * Returns the decoded claims; aud/act checks belong to the calling guard.
   * Throws on any failure.
   */
  async verify(token: string): Promise<Record<string, unknown>> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("S2S token: malformed JWS");
    const [h, p, s] = parts as [string, string, string];
    const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== "RS256") {
      throw new Error(`S2S token: unsupported alg ${header.alg}`);
    }
    if (!header.kid) throw new Error("S2S token: missing kid");

    const key = await this.getKey(header.kid);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${h}.${p}`);
    verifier.end();
    if (!verifier.verify(key, Buffer.from(s, "base64url"))) {
      throw new Error("S2S token: signature verification failed");
    }

    const claims = JSON.parse(
      Buffer.from(p, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (claims["iss"] !== this.config.auth.OIDC_ISSUER) {
      throw new Error("S2S token: iss mismatch");
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof claims["exp"] === "number" &&
      claims["exp"] + CLOCK_SKEW_SEC < now
    ) {
      throw new Error("S2S token: expired");
    }
    return claims;
  }

  /** Resolve a public key by kid, fetching+caching JWKS (one refresh on miss). */
  private async getKey(kid: string): Promise<KeyObject> {
    if (this.keysByKid.has(kid)) return this.keysByKid.get(kid)!;
    await this.refreshJwks();
    const key = this.keysByKid.get(kid);
    if (!key) throw new Error(`S2S token: JWKS has no key for kid=${kid}`);
    return key;
  }

  private async refreshJwks(): Promise<void> {
    const res = await fetch(this.jwksUri);
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    const { keys } = (await res.json()) as { keys: Jwk[] };
    const next = new Map<string, KeyObject>();
    for (const jwk of keys) {
      try {
        next.set(
          jwk.kid,
          createPublicKey({ key: jwk as unknown as JsonWebKey, format: "jwk" }),
        );
      } catch {
        // skip unusable key
      }
    }
    this.keysByKid = next;
  }
}
