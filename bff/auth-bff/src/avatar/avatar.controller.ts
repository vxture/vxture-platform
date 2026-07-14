/**
 * avatar.controller.ts — public custom-avatar serving (identity-platform-account.md §5 D-4).
 * @package @vxture/bff-auth
 *
 * Serves ONLY stored custom/imported avatars by user. No row → 404 (the default
 * avatar is a frontend-inline asset, D-2; and the `picture` claim is omitted when
 * there is no custom avatar, so clients never request a missing one). Public,
 * unauthenticated (avatars are low-sensitivity, URL carries a UUID), versioned +
 * immutable so the browser caches aggressively; a changed avatar yields a new
 * `?v=<hash>` URL via the next token.
 */
import { Controller, Get, Inject, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AccountService } from "@vxture/service-account";
import { stripSubPrefix } from "../oidc/oidc.service";

@Controller("avatar")
export class AvatarController {
  constructor(
    @Inject(AccountService) private readonly account: AccountService,
  ) {}

  /** GET /avatar/usr_<id>[?v=<hash>] → the user's custom avatar bytes, or 404. */
  @Get(":sub")
  async serve(
    @Param("sub") sub: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const id = stripSubPrefix(sub);
    let avatar;
    try {
      avatar = await this.account.getAvatar(id);
    } catch {
      // Malformed id (e.g. not a UUID) → treat as not found.
      avatar = null;
    }
    if (!avatar) {
      res.status(404).end();
      return;
    }
    const etag = `"${avatar.hash}"`;
    res.setHeader("ETag", etag);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader("Content-Type", avatar.contentType);
    res.end(avatar.data);
  }
}
