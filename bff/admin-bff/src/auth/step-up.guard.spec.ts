import { describe, it, expect } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import type { ModuleRef, Reflector } from "@nestjs/core";
import type { OidcRpClient } from "@vxture/core-oidc-rp";
import { OperatorStepUpGuard } from "./step-up.guard";
import { stepUpCookieName } from "./step-up.decorator";
import {
  RP_OIDC_CLIENT,
  RP_RUNTIME,
  type RpRuntime,
} from "../oidc/oidc-rp.tokens";

const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";
const COOKIE = stepUpCookieName(true); // cookieSecure=true → __Host-vx_op_stepup

/** Build a guard with stubbed reflector + RP client. */
function makeGuard(opts: {
  required: boolean;
  verify?: (token: string) => Promise<Record<string, unknown>>;
}): OperatorStepUpGuard {
  const reflector = {
    getAllAndOverride: () => opts.required,
  } as unknown as Reflector;
  const client = {
    verifyAccessToken:
      opts.verify ?? (() => Promise.reject(new Error("no verifier"))),
  } as unknown as OidcRpClient;
  const runtime = { cookieSecure: true } as unknown as RpRuntime;
  // The guard resolves RP deps lazily via ModuleRef (see step-up.guard.ts).
  const moduleRef = {
    get: (token: unknown) =>
      token === RP_OIDC_CLIENT
        ? client
        : token === RP_RUNTIME
          ? runtime
          : undefined,
  } as unknown as ModuleRef;
  return new OperatorStepUpGuard(reflector, moduleRef);
}

/** Build an ExecutionContext over a fake request. */
function ctx(req: {
  user?: { id: string };
  cookies?: Record<string, string>;
}): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const validClaims = {
  sub: `opr_${OPERATOR_ID}`,
  aud: "admin",
  stepup: true,
};

describe("OperatorStepUpGuard", () => {
  it("allows non-decorated routes (no step-up required)", async () => {
    const guard = makeGuard({ required: false });
    const ok = await guard.canActivate(
      ctx({ user: { id: OPERATOR_ID }, cookies: {} }),
    );
    expect(ok).toBe(true);
  });

  it("allows a valid, session-bound step-up credential", async () => {
    const guard = makeGuard({
      required: true,
      verify: async () => validClaims,
    });
    const ok = await guard.canActivate(
      ctx({ user: { id: OPERATOR_ID }, cookies: { [COOKIE]: "tok" } }),
    );
    expect(ok).toBe(true);
  });

  it("rejects when there is no session operator", async () => {
    const guard = makeGuard({
      required: true,
      verify: async () => validClaims,
    });
    await expect(
      guard.canActivate(ctx({ cookies: { [COOKIE]: "tok" } })),
    ).rejects.toThrow("step_up_required");
  });

  it("rejects when the step-up cookie is absent", async () => {
    const guard = makeGuard({
      required: true,
      verify: async () => validClaims,
    });
    await expect(
      guard.canActivate(ctx({ user: { id: OPERATOR_ID }, cookies: {} })),
    ).rejects.toThrow("step_up_required");
  });

  it("rejects an expired/invalid credential (verify throws)", async () => {
    const guard = makeGuard({
      required: true,
      verify: () => Promise.reject(new Error("OIDC token expired")),
    });
    await expect(
      guard.canActivate(
        ctx({ user: { id: OPERATOR_ID }, cookies: { [COOKIE]: "tok" } }),
      ),
    ).rejects.toThrow("step_up_required");
  });

  it("rejects a credential bound to a different operator (sub mismatch)", async () => {
    const guard = makeGuard({
      required: true,
      verify: async () => ({ ...validClaims, sub: "opr_someone-else" }),
    });
    await expect(
      guard.canActivate(
        ctx({ user: { id: OPERATOR_ID }, cookies: { [COOKIE]: "tok" } }),
      ),
    ).rejects.toThrow("step_up_required");
  });

  it("rejects a token without the stepup claim", async () => {
    const guard = makeGuard({
      required: true,
      verify: async () => ({ sub: `opr_${OPERATOR_ID}`, aud: "admin" }),
    });
    await expect(
      guard.canActivate(
        ctx({ user: { id: OPERATOR_ID }, cookies: { [COOKIE]: "tok" } }),
      ),
    ).rejects.toThrow("step_up_required");
  });
});
