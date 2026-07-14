/**
 * token.service.ts — the token authority (Identity Platform §6.3).
 *
 * Mints RS256 access tokens (via OidcKeyService / appoidc.signing_keys) carrying the
 * new claim set (sub + active_org + active_workspace + roles; NO entitlement),
 * and opaque refresh tokens stored hashed in session.refresh_tokens with rotation
 * + replay detection.
 */
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { VxConfigService } from "@vxture/core-config";
import { OidcKeyService } from "../oidc/oidc-key.service";
import { buildAccessClaims } from "./access-claims";
import {
  hashToken,
  RefreshTokenRepository,
  type RefreshRecord,
  type RefreshStore,
} from "./refresh-token.repository";
import {
  OPERATOR_REFRESH_TOKEN_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from "./tokens";

export interface IssueAccessInput {
  /** sub claim (e.g. usr_<userId> or opr_<operatorId>). */
  sub: string;
  /** aud claim — the client_id. */
  audience: string;
  sessionId?: string | null;
  activeOrg?: string | null;
  activeOrgType?: string | null;
  activeOrgName?: string | null;
  activeWorkspace?: string | null;
  activeWorkspaceName?: string | null;
  roles?: string[];
  userType?: string;
  ttlSeconds?: number;
  extra?: Record<string, unknown>;
}

export interface IssueRefreshInput {
  userId: string;
  sessionId: string;
  clientId: string;
  ttlSeconds?: number;
  /**
   * "operator" → admin.operator_refresh_token; anything else (default) →
   * session.refresh_tokens. Keeps operator refresh tokens out of the tenant store.
   */
  realm?: string;
}

export interface RotatedRefresh {
  refreshToken: string;
  userId: string;
  sessionId: string;
  clientId: string;
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(OidcKeyService) private readonly keys: OidcKeyService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refresh: RefreshStore,
    @Inject(OPERATOR_REFRESH_TOKEN_REPOSITORY)
    private readonly operatorRefresh: RefreshStore,
    @Inject(VxConfigService) private readonly config: VxConfigService,
  ) {}

  /** Refresh store for a realm: operator → ops.*, else tenant → identity.*. */
  private storeFor(realm?: string): RefreshStore {
    return realm === "workforce" ? this.operatorRefresh : this.refresh;
  }

  /**
   * Find a presented refresh token in whichever realm store holds it (tenant
   * first, then operator). Returns the record + its owning store so rotation /
   * revocation stays within the right table.
   */
  private async locate(
    rawToken: string,
  ): Promise<{ store: RefreshStore; rec: RefreshRecord } | null> {
    const hash = hashToken(rawToken);
    const tenant = await this.refresh.findByHash(hash);
    if (tenant) return { store: this.refresh, rec: tenant };
    const operator = await this.operatorRefresh.findByHash(hash);
    if (operator) return { store: this.operatorRefresh, rec: operator };
    return null;
  }

  /** Mint an RS256 access token with the new claim set. */
  issueAccessToken(input: IssueAccessInput): string {
    const claims = buildAccessClaims(input);
    return this.keys.sign(claims, {
      audience: input.audience,
      subject: input.sub,
      expiresInSec: input.ttlSeconds ?? this.config.auth.OIDC_ACCESS_TTL,
    });
  }

  /** Issue a new opaque refresh token (stored hashed); returns the raw token. */
  async issueRefreshToken(input: IssueRefreshInput): Promise<string> {
    const raw = RefreshTokenRepository.newRawToken();
    await this.storeFor(input.realm).insert({
      userId: input.userId,
      sessionId: input.sessionId,
      clientId: input.clientId,
      tokenHash: hashToken(raw),
      ttlSeconds: input.ttlSeconds ?? this.config.auth.OIDC_REFRESH_TTL,
    });
    return raw;
  }

  /**
   * Rotate a refresh token. Replay (a token not 'active', or a lost race on
   * marking it rotated) revokes the whole session chain and rejects. Returns the
   * new raw refresh token + the context needed to mint a fresh access token.
   * The rotation stays within the realm store that holds the presented token.
   */
  async rotateRefreshToken(rawToken: string): Promise<RotatedRefresh> {
    const found = await this.locate(rawToken);
    if (!found || found.rec.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("invalid_grant");
    }
    const { store, rec } = found;
    if (rec.status !== "active") {
      // Reuse of an already-rotated/revoked token → revoke the family.
      await store.revokeSession(rec.sessionId);
      throw new UnauthorizedException("refresh token reuse detected");
    }
    const won = await store.markRotated(rec.id);
    if (!won) {
      await store.revokeSession(rec.sessionId);
      throw new UnauthorizedException("refresh token reuse detected");
    }
    const newRaw = RefreshTokenRepository.newRawToken();
    await store.insert({
      userId: rec.userId,
      sessionId: rec.sessionId,
      clientId: rec.clientId,
      tokenHash: hashToken(newRaw),
      ttlSeconds: this.config.auth.OIDC_REFRESH_TTL,
      rotatedFrom: rec.id,
    });
    return {
      refreshToken: newRaw,
      userId: rec.userId,
      sessionId: rec.sessionId,
      clientId: rec.clientId,
    };
  }

  /**
   * Revoke all live refresh tokens for a session (logout). Realm-blind: a session
   * id lives in exactly one store, so revoke in both (the other no-ops).
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.refresh.revokeSession(sessionId);
    await this.operatorRefresh.revokeSession(sessionId);
  }

  /** Revoke a refresh token by its raw value (RFC 7009) — revokes its session chain. */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const found = await this.locate(rawToken);
    if (found) await found.store.revokeSession(found.rec.sessionId);
  }
}
