import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { SessionAggregator } from "../aggregators/session.aggregator";
import type { RequestContext } from "../types/console.types";

const AUTH_CONTEXT_ONLY_PATHS = new Set(["/api/auth/tenant/switch"]);

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
      context.capabilities = await this.sessionAggregator.getCapabilities(
        context.user.id,
        context.tenant?.id,
      );
    }

    next();
  }
}
