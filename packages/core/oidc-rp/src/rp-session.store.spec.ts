import { describe, it, expect } from "vitest";
import { RpSessionStore, type RpRedis } from "./rp-session.store";
import type { RpSession } from "./types";

/** Tiny in-memory Redis implementing the RpRedis subset (with set support). */
function fakeRedis(): RpRedis & {
  _kv: Map<string, string>;
  _sets: Map<string, Set<string>>;
} {
  const kv = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    _kv: kv,
    _sets: sets,
    async get(k) {
      return kv.get(k) ?? null;
    },
    async setex(k, _ttl, v) {
      kv.set(k, v);
    },
    async del(...keys) {
      for (const k of keys) {
        kv.delete(k);
        sets.delete(k);
      }
    },
    async sadd(k, ...members) {
      const s = sets.get(k) ?? new Set<string>();
      members.forEach((m) => s.add(m));
      sets.set(k, s);
    },
    async srem(k, ...members) {
      const s = sets.get(k);
      members.forEach((m) => s?.delete(m));
    },
    async smembers(k) {
      return [...(sets.get(k) ?? [])];
    },
    async expire() {
      /* no-op for the fake */
    },
  };
}

function makeSession(sid: string, sub = "usr_1"): RpSession {
  return {
    sid,
    sub,
    idToken: "id",
    accessToken: "acc",
    refreshToken: "ref",
    accessExpiresAt: 9999999999,
    activeOrg: "tn1",
  };
}

describe("RpSessionStore", () => {
  it("creates and reads a session by rpsid (namespaced per client)", async () => {
    const r = fakeRedis();
    const store = new RpSessionStore(r, "console");
    await store.create("rps1", makeSession("sidA"), 100);
    expect([...r._kv.keys()][0]).toBe("vx:rp:console:sess:rps1");
    const got = await store.get("rps1");
    expect(got?.sub).toBe("usr_1");
    expect(got?.sid).toBe("sidA");
  });

  it("destroy removes the session and de-indexes from its sid", async () => {
    const r = fakeRedis();
    const store = new RpSessionStore(r, "console");
    await store.create("rps1", makeSession("sidA"), 100);
    await store.destroy("rps1");
    expect(await store.get("rps1")).toBeNull();
    expect(await r.smembers("vx:rp:console:sididx:sidA")).toHaveLength(0);
  });

  it("destroyBySid kills all RP sessions under one IdP sid (back-channel logout)", async () => {
    const r = fakeRedis();
    const store = new RpSessionStore(r, "console");
    await store.create("rps1", makeSession("sidA"), 100);
    await store.create("rps2", makeSession("sidA"), 100); // same sid, 2 devices/tabs
    await store.create("rps3", makeSession("sidB"), 100);
    const killed = await store.destroyBySid("sidA");
    expect(killed).toBe(2);
    expect(await store.get("rps1")).toBeNull();
    expect(await store.get("rps2")).toBeNull();
    expect(await store.get("rps3")).not.toBeNull(); // different sid untouched
  });

  it("isolates namespaces across client ids", async () => {
    const r = fakeRedis();
    const console = new RpSessionStore(r, "console");
    const website = new RpSessionStore(r, "website");
    await console.create("rps1", makeSession("sidA"), 100);
    expect(await website.get("rps1")).toBeNull();
    expect(await console.get("rps1")).not.toBeNull();
  });
});
