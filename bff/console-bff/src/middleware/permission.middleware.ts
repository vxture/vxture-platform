import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { SessionAggregator } from "../aggregators/session.aggregator";
import type { RequestContext } from "../types/console.types";
import { AUTH_CONTEXT_ONLY_PATHS } from "./auth-context-paths";

@Injectable()
export class PermissionMiddleware implements NestMiddleware {
  constructor(
    @Inject(SessionAggregator)
    private readonly sessionAggregator: SessionAggregator,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    if (AUTH_CONTEXT_ONLY_PATHS.has(req.path)) {
      next();
      return;
    }

    const context = req as Request & RequestContext;
    if (context.user) {
      // TenantMiddleware runs before this and has already resolved the active
      // org and 401/403-gated the request, so a present context.tenant means the
      // org exists — the only fact async getCapabilities' ~4-query resolveOrg
      // determines. Derive the same capabilities in-memory instead of resolving
      // the org a second time on every /api/* request.
      context.capabilities = this.sessionAggregator.capabilitiesForContext(
        Boolean(context.tenant),
      );
    }

    next();
  }
}
