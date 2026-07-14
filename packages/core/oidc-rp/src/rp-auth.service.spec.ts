import { describe, it, expect } from "vitest";
import { RpAuthService } from "./rp-auth.service";
import { RpSessionStore, type RpRedis } from "./rp-session.store";
import type { OidcRpClient, OidcTokenSet, RpSession } from "./types";

function fakeRedis(): RpRedis {
  const kv = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    async get(k) {
      return kv.get(k) ?? null;
    },
    async setex(k, _t, v) {
      kv.set(k, v);
    },
    async del(...keys) {
      keys.forEach((k) => {
        kv.delete(k);
        sets.delete(k);
      });
    },
    async sadd(k, ...m) {
      const s = sets.get(k) ?? new Set();
      m.forEach((x) => s.add(x));
      sets.set(k, s);
    },
    async srem(k, ...m) {
      m.forEach((x) => sets.get(k)?.delete(x));
    },
    async smembers(k) {
      return [...(sets.get(k) ?? [])];
    },
    async expire() {},
  };
}

const now = () => Math.floor(Date.now() / 1000);

/** OidcRpClient stub: only refresh + verifyAccessToken are exercised here. */
function fakeClient(opts: {
  refresh?: () => Promise<OidcTokenSet>;
  verify?: (t: string) => Promise<Record<string, unknown>>;
}): OidcRpClient {
  return {
    buildAuthorizeUrl: () => "",
    exchangeCode: async () => ({}) as OidcTokenSet,
    refresh: opts.refresh ?? (async () => ({}) as OidcTokenSet),
    verifyIdToken: async () => ({}) as never,
    verifyAccessToken:
      opts.verify ?? (async () => ({ sub: "usr_1", active_tenant: "tn1" })),
    verifyLogoutToken: async () => ({ sid: "sidA" }),
    buildEndSessionUrl: () => "",
  };
}

function session(overrides: Partial<RpSession> = {}): RpSession {
  return {
    sid: "sidA",
    sub: "usr_1",
    idToken: "id",
    accessToken: "acc",
    refreshToken: "ref",
    accessExpiresAt: now() + 3600,
    activeOrg: "tn1",
    ...overrides,
  };
}

describe("RpAuthService.resolve", () => {
  it("returns expired when rpsid is missing or no session", async () => {
    const store = new RpSessionStore(fakeRedis(), "console");
    const svc = new RpAuthService(store, fakeClient({}), 3600);
    expect((await svc.resolve(undefined)).status).toBe("expired");
    expect((await svc.resolve("nope")).status).toBe("expired");
  });

  it("verifies a fresh session without refreshing", async () => {
    const store = new RpSessionStore(fakeRedis(), "console");
    await store.create("rps1", session(), 3600);
    let refreshCalled = false;
    const svc = new RpAuthService(
      store,
      fakeClient({
        refresh: async () => {
          refreshCalled = true;
          return {} as OidcTokenSet;
        },
      }),
      3600,
    );
    const out = await svc.resolve("rps1");
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.refreshed).toBe(false);
      expect(out.claims.sub).toBe("usr_1");
    }
    expect(refreshCalled).toBe(false);
  });

  it("refreshes when the access token is near expiry and persists the rotation", async () => {
    const store = new RpSessionStore(fakeRedis(), "console");
    await store.create("rps1", session({ accessExpiresAt: now() + 10 }), 3600); // within skew
    const svc = new RpAuthService(
      store,
      fakeClient({
        refresh: async () => ({
          idToken: "id2",
          accessToken: "acc2",
          refreshToken: "ref2",
          accessExpiresAt: now() + 3600,
        }),
      }),
      3600,
    );
    const out = await svc.resolve("rps1");
    expect(out.status).toBe("ok");
    if (out.status === "ok") expect(out.refreshed).toBe(true);
    // rotation persisted server-side
    expect((await store.get("rps1"))?.accessToken).toBe("acc2");
  });

  it("returns expired and drops the session when refresh fails (reuse/revoked)", async () => {
    const store = new RpSessionStore(fakeRedis(), "console");
    await store.create("rps1", session({ accessExpiresAt: now() + 5 }), 3600);
    const svc = new RpAuthService(
      store,
      fakeClient({
        refresh: async () => {
          throw new Error("invalid_grant");
        },
      }),
      3600,
    );
    expect((await svc.resolve("rps1")).status).toBe("expired");
    expect(await store.get("rps1")).toBeNull(); // dropped
  });

  it("returns expired when access-token verification fails", async () => {
    const store = new RpSessionStore(fakeRedis(), "console");
    await store.create("rps1", session(), 3600);
    const svc = new RpAuthService(
      store,
      fakeClient({
        verify: async () => {
          throw new Error("bad sig");
        },
      }),
      3600,
    );
    expect((await svc.resolve("rps1")).status).toBe("expired");
  });
});
