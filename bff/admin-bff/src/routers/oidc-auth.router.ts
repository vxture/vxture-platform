/**
 * oidc-auth.router.ts - admin (operator) RP auth endpoints (P2, additive)
 * @package @vxture/bff-admin
 * @description
 *   /auth/* RP endpoints (outside api/*, so the legacy AuthMiddleware is not
 *   involved): login → IdP authorize (operator realm), callback → token
 *   exchange + RP session, session lookup, local logout. Tokens stay
 *   server-side; the browser holds only the opaque __Host-vx_rp_session cookie.
 *   Operator sessions are isolated from the tenant realm by construction
 *   (aud=admin, sub=opr_, userType=operator). See docs/design/identity-platform-operator.md §3/§4.
 */
import {
  Controller,
  Get,
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
    return `${this.rt.keyPrefix}rp:admin:authreq:${state}`;
  }

  /** __Host- in prod https; bare name over local http so the browser stores it. */
  private get cookieName(): string {
    return rpSessionCookieName(this.rt.cookieSecure, this.rt.config.clientId);
  }

  /**
   * SSO Presence —— 身份状态缓存，认证链路的三态里唯一需要显式存储的那一态。
   *
   *   Authenticated —— 由 RP 会话 cookie 本身表达，不需要额外标记
   *   Anonymous     —— 本 cookie（值 `anonymous`）：刚问过 IdP，中央会话不存在
   *   Unknown       —— 两个都没有：还没问过
   *
   * 为什么必须存下来：静默探测失败这件事**原先只写在 returnTo 的 URL 参数上**
   * （`vx_sso_silent=0`），前端拿到后立刻 replaceState 抹掉——于是它是一次性的。
   * 用户刷新一次、或重新输一次地址，整套「login → authorize → callback →
   * 带着失败标记回门户」的往返就从头再跑一遍，4 跳 + 2 次整页绘制，只为得到
   * 上一秒刚知道的答案。这正是"要闪好几次才进登录页"的根源（2026-08-04 实测：
   * 冷启动 9 跳 3 次绘制）。
   *
   * **由服务端与 middleware 共同消费**：BFF 的 `/auth/login` 用它决定这一轮要不要
   * 静默；门户的 middleware 用它在**渲染之前**决定是放行、去交互登录、还是探测
   * 一次。因此保持 httpOnly——判断全在服务端，页面脚本不需要也不应该读它。
   *
   * 它只是缓存，不是授权凭据：最坏情况（被伪造 / 过期未清）是**多走**一次交互
   * 登录，不会让任何人少走一步认证。
   */
  private readonly presenceCookie = "vx_admin_sso_presence";
  /** 5 分钟：够覆盖"连续刷新几次"，短到中央会话真的建立后不会挡路太久。 */
  private readonly presenceMaxAgeMs = 5 * 60 * 1000;

  private markAnonymous(res: Response): void {
    res.cookie(this.presenceCookie, "anonymous", {
      httpOnly: true,
      sameSite: "lax",
      secure: this.rt.cookieSecure,
      path: "/",
      maxAge: this.presenceMaxAgeMs,
    });
  }

  /** 回到 Unknown。会话建立/注销时清掉，避免它继续压制静默探测。 */
  private clearPresence(res: Response): void {
    res.clearCookie(this.presenceCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.rt.cookieSecure,
      path: "/",
    });
  }

  /** Begin login: stash PKCE/nonce/returnTo, redirect to the IdP authorize page. */
  @Get("login")
  async login(
    @Query("returnTo") returnTo: string | undefined,
    @Query("prompt") prompt: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    /* 上一轮刚确认过没有中央会话 → 这一轮别再静默问一遍。省掉的正是
     * 「authorize(prompt=none) → callback(login_required) → 回门户」那 3 跳
     * 和随之而来的一次整页绘制；用户直接落到 IdP 登录页。 */
    if (
      prompt === "none" &&
      req.cookies?.[this.presenceCookie] === "anonymous"
    ) {
      prompt = undefined;
    }
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

  /** OIDC callback: exchange the code, verify, establish the RP session, set cookie. */
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
            // 记住这次静默失败，下一次 /auth/login?prompt=none 直接转交互式。
            this.markAnonymous(res);
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
    await this.client.verifyAccessToken(tokens.accessToken);

    // Operator sessions carry no organization — activeOrg is always null.
    const session: RpSession = {
      sid: id.sid,
      sub: id.sub,
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: tokens.accessExpiresAt,
      activeOrg: null,
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
    // 会话真建立了 → 清掉"没有中央会话"的备忘，否则它会在剩余有效期里继续
    // 压制静默 SSO（表现为登出后再登录要多走一次交互）。
    this.clearPresence(res);
    res.redirect(authReq.returnTo);
  }

  /** Current login state (verified claims) for the SPA bootstrap. */
  @Get("session")
  async session(@Req() req: Request): Promise<Record<string, unknown>> {
    const rpsid = req.cookies?.[this.cookieName] as string | undefined;
    const out = await this.auth.resolve(rpsid);
    if (out.status !== "ok") {
      throw new UnauthorizedException("No active session");
    }
    return { status: "active", claims: out.claims };
  }

  /** Local logout: drop the RP session + clear the cookie (does not end the IdP session). */
  @Post("logout")
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const rpsid = req.cookies?.[this.cookieName] as string | undefined;
    if (rpsid) await this.store.destroy(rpsid);
    res.clearCookie(this.cookieName, { path: "/" });
    /* 登出后不要留着"没有中央会话"的备忘：IdP 那边的中央会话未必跟着结束
     * （单点登出是另一条链路），留着会让下一次登录白白跳过一次本可成功的
     * 静默 SSO。 */
    this.clearPresence(res);
    res.json({ status: "logged_out" });
  }
}
