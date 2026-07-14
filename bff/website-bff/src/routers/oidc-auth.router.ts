/**
 * oidc-auth.router.ts - website RP auth endpoints (P1-e, additive)
 * @package @vxture/bff-website
 * @description
 *   /auth/* RP endpoints (outside api/*). login → IdP authorize, callback →
 *   token exchange + RP session, session lookup, local logout. Tokens stay
 *   server-side; the browser holds only __Host-vx_rp_session.
 *   See identity-platform-rp-integration.md §2/§4.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  generatePkce,
  mapAccessClaims,
  randomToken,
  safeReturnTo,
  rpSessionCookieName,
  type OidcRpClient,
  type RpAuthService,
  type RpSession,
  type RpSessionStore,
} from "@vxture/core-oidc-rp";
import type { Redis } from "ioredis";
import {
  RP_AUTH_SERVICE,
  RP_OIDC_CLIENT,
  RP_REDIS,
  RP_RUNTIME,
  RP_SESSION_STORE,
  type RpRuntime,
} from "../oidc/oidc-rp.tokens";

interface AuthReq {
  codeVerifier: string;
  nonce: string;
  returnTo: string;
  prompt?: string;
}

@Controller("auth")
export class OidcAuthRouter {
  constructor(
    @Inject(RP_OIDC_CLIENT) private readonly client: OidcRpClient,
    @Inject(RP_SESSION_STORE) private readonly store: RpSessionStore,
    @Inject(RP_AUTH_SERVICE) private readonly auth: RpAuthService,
    @Inject(RP_REDIS) private readonly redis: Redis,
    @Inject(RP_RUNTIME) private readonly rt: RpRuntime,
  ) {}

  private authReqKey(state: string): string {
    return `${this.rt.keyPrefix}rp:${this.rt.config.clientId}:authreq:${state}`;
  }

  /** __Host- in prod https; bare name over local http so the browser stores it. */
  private get cookieName(): string {
    return rpSessionCookieName(this.rt.cookieSecure);
  }

  @Get("login")
  async login(
    @Query("returnTo") returnTo: string | undefined,
    @Query("prompt") prompt: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const { verifier, challenge } = generatePkce();
    const state = randomToken();
    const nonce = randomToken();
    const dest = safeReturnTo(
      returnTo,
      this.rt.allowedReturnOrigins,
      this.rt.defaultReturnTo,
    );
    const payload: AuthReq = {
      codeVerifier: verifier,
      nonce,
      returnTo: dest,
      ...(prompt && { prompt }),
    };
    await this.redis.setex(
      this.authReqKey(state),
      600,
      JSON.stringify(payload),
    );
    res.redirect(
      this.client.buildAuthorizeUrl({
        state,
        nonce,
        codeChallenge: challenge,
        ...(prompt !== undefined && { prompt }),
      }),
    );
  }

  @Get("callback")
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (error) {
      // For prompt=none silent flows: login_required/interaction_required means
      // no active central session — redirect back to returnTo so the page renders
      // as unauthenticated without a visible error.
      if (
        (error === "login_required" || error === "interaction_required") &&
        state
      ) {
        const raw = await this.redis.getdel(this.authReqKey(state));
        if (raw) {
          const authReq = JSON.parse(raw) as AuthReq;
          if (authReq.prompt === "none") {
            const u = new URL(authReq.returnTo);
            u.searchParams.set("vx_sso_silent", "0");
            res.redirect(u.toString());
            return;
          }
        }
      }
      res.status(401).json({ code: "OIDC_ERROR", message: error });
      return;
    }
    if (!code || !state) {
      res.status(400).json({ code: "INVALID_REQUEST" });
      return;
    }
    const raw = await this.redis.getdel(this.authReqKey(state));
    if (!raw) {
      res.status(400).json({ code: "INVALID_STATE" });
      return;
    }
    const authReq = JSON.parse(raw) as AuthReq;

    const tokens = await this.client.exchangeCode({
      code,
      codeVerifier: authReq.codeVerifier,
    });
    const id = await this.client.verifyIdToken(tokens.idToken, authReq.nonce);
    const accessClaims = await this.client.verifyAccessToken(
      tokens.accessToken,
    );

    const session: RpSession = {
      sid: id.sid,
      sub: id.sub,
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: tokens.accessExpiresAt,
      activeOrg: mapAccessClaims(accessClaims).activeOrg,
    };
    const rpsid = randomToken();
    await this.store.create(rpsid, session, this.rt.config.sessionTtlSec);

    res.cookie(this.cookieName, rpsid, {
      httpOnly: true,
      secure: this.rt.cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: this.rt.config.sessionTtlSec * 1000,
    });
    res.redirect(authReq.returnTo);
  }

  @Get("session")
  async session(@Req() req: Request): Promise<Record<string, unknown>> {
    const rpsid = req.cookies?.[this.cookieName] as string | undefined;
    const out = await this.auth.resolve(rpsid);
    if (out.status !== "ok") {
      throw new UnauthorizedException("No active session");
    }
    return { status: "active", claims: out.claims };
  }

  /**
   * Post-logout redirect URI handed to the IdP end_session endpoint.
   * - signout: website home (${WEBSITE_BASE_URL}/) — skips the accounts/logout
   *   intermediate page entirely; the user lands directly on the home page.
   * - switch: accounts/logout?mode=switch — accounts shows the login form so
   *   the user can sign in as a different identity.
   * Both URIs must be registered in the website client's post_logout_redirect_uris
   * in seed-catalog.mjs.
   */
  private buildPostLogout(mode: "signout" | "switch"): string {
    if (mode === "signout") {
      return this.rt.defaultReturnTo;
    }
    const u = new URL(this.rt.postLogoutRedirectUri);
    u.searchParams.set("client", this.rt.config.clientId);
    u.searchParams.set("mode", mode);
    u.searchParams.set(
      "relogin",
      this.rt.config.redirectUri.replace(/\/auth\/callback$/, "/auth/login"),
    );
    return u.toString();
  }

  /**
   * Drop the local RP session + cookie, then top-level-redirect to the IdP
   * end_session — which kills the central session (vx_sid), back-channel-logs-out
   * all RPs, and lands on the unified accounts post-logout page.
   * identity-platform-access-topology.md §5.
   */
  private async endCentralSession(
    req: Request,
    res: Response,
    mode: "signout" | "switch",
  ): Promise<void> {
    const rpsid = req.cookies?.[this.cookieName] as string | undefined;
    if (rpsid) await this.store.destroy(rpsid);
    res.clearCookie(this.cookieName, { path: "/" });
    res.redirect(
      this.client.buildEndSessionUrl({
        postLogoutRedirectUri: this.buildPostLogout(mode),
        state: randomToken(),
      }),
    );
  }

  /** RP-initiated sign-out (top-level GET so the browser sends vx_sid). */
  @Get("logout")
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.endCentralSession(req, res, "signout");
  }

  /**
   * "Switch user": end the session like logout, but signal the accounts page to
   * land on the login form (this RP's /auth/login → a fresh authorize) so the user
   * can immediately sign in as a different account.
   */
  @Get("switch")
  async switch(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.endCentralSession(req, res, "switch");
  }

  /**
   * Back-channel logout receiver (OpenID Back-Channel Logout 1.0): the IdP POSTs
   * a signed logout_token (form-encoded) when the central session ends; verify it
   * and destroy all RP sessions under that sid. Idempotent; 200 + no-store.
   * See identity-platform-access-topology.md §5.
   */
  @Post("backchannel-logout")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  async backchannelLogout(
    @Body() body: { logout_token?: string },
  ): Promise<{ status: string }> {
    const token = body?.logout_token;
    if (!token) throw new BadRequestException("missing logout_token");
    let sid: string;
    try {
      ({ sid } = await this.client.verifyLogoutToken(token));
    } catch {
      throw new BadRequestException("invalid logout_token");
    }
    if (sid) await this.store.destroyBySid(sid);
    return { status: "logged_out" };
  }
}
