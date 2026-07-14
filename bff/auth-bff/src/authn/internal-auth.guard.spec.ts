import { describe, expect, it } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { InternalAuthGuard, INTERNAL_AUTH_HEADER } from "./internal-auth.guard";

// Unit tests: legacy shared-secret guard only. This guard protects
// operator/account admin-internal routers (post-review scope correction,
// 2026-07-12) — it must NEVER accept a bearer/S2S credential; see
// platform-auth.guard.spec.ts for the dual-accept guard used by the
// platform-face C2/C3 self-service routers.

const SHARED_SECRET = "shared-secret-value-32-bytes-min";

function makeGuard(authInternalToken: string | undefined): InternalAuthGuard {
  const config = {
    auth: { AUTH_INTERNAL_TOKEN: authInternalToken },
  } as unknown as ConstructorParameters<typeof InternalAuthGuard>[0];
  return new InternalAuthGuard(config);
}

interface FakeRequest {
  headers: Record<string, string>;
  header(name: string): string | undefined;
}

function fakeRequest(headers: Record<string, string> = {}): FakeRequest {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: lower,
    header(name: string) {
      return lower[name.toLowerCase()];
    },
  };
}

function ctx(req: FakeRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("InternalAuthGuard", () => {
  it("passes with a correct x-vxture-internal-auth header", () => {
    const guard = makeGuard(SHARED_SECRET);
    const req = fakeRequest({ [INTERNAL_AUTH_HEADER]: SHARED_SECRET });
    expect(guard.canActivate(ctx(req))).toBe(true);
  });

  it("rejects a wrong shared secret", () => {
    const guard = makeGuard(SHARED_SECRET);
    const req = fakeRequest({ [INTERNAL_AUTH_HEADER]: "wrong" });
    expect(() => guard.canActivate(ctx(req))).toThrow(UnauthorizedException);
  });

  it("fails closed when AUTH_INTERNAL_TOKEN is unconfigured", () => {
    const guard = makeGuard(undefined);
    const req = fakeRequest({ [INTERNAL_AUTH_HEADER]: "anything" });
    expect(() => guard.canActivate(ctx(req))).toThrow(UnauthorizedException);
  });

  it("rejects when no header is presented", () => {
    const guard = makeGuard(SHARED_SECRET);
    expect(() => guard.canActivate(ctx(fakeRequest()))).toThrow(
      UnauthorizedException,
    );
  });

  it("ignores an Authorization: Bearer header — this guard has no S2S path", () => {
    const guard = makeGuard(SHARED_SECRET);
    // A caller presenting a bearer token (even a well-formed one) but no
    // legacy header must still be rejected here — this guard's consumers
    // (operator/account admin-internal routers) must never accept S2S
    // tokens, which is exactly the bug the platform-auth.guard.ts split fixed.
    const req = fakeRequest({ authorization: "Bearer some.jwt.token" });
    expect(() => guard.canActivate(ctx(req))).toThrow(UnauthorizedException);
  });
});
