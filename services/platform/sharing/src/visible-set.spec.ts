import { describe, expect, it } from "vitest";
import {
  isFresh,
  mergeVisibleSet,
  strongerScope,
  toVisibleResource,
  type HitGrant,
} from "./visible-set";

const hit = (over: Partial<HitGrant>): HitGrant => ({
  resourceType: "knowledge_base",
  resourceProductId: "p-karda",
  resourceProductCode: "karda",
  resourceWorkspaceId: "ws-owner",
  resourceRef: "kb-1",
  scope: "retrieve",
  expiresAt: null,
  ...over,
});

describe("strongerScope (§8.2 per-type ladder)", () => {
  it("apply beats retrieve on knowledge_base", () => {
    expect(strongerScope("knowledge_base", "retrieve", "apply")).toBe("apply");
    expect(strongerScope("knowledge_base", "apply", "retrieve")).toBe("apply");
  });

  it("single-value ladders are stable", () => {
    expect(strongerScope("dataset", "read", "read")).toBe("read");
    expect(strongerScope("skill", "use", "use")).toBe("use");
  });
});

describe("mergeVisibleSet (§8.3 multi-grant merge)", () => {
  it("merges same-resource grants to the strongest scope", () => {
    const rows = mergeVisibleSet([
      hit({ scope: "retrieve" }),
      hit({ scope: "apply" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.scope).toBe("apply");
  });

  it("keeps distinct resources separate", () => {
    const rows = mergeVisibleSet([hit({}), hit({ resourceRef: "kb-2" })]);
    expect(rows).toHaveLength(2);
  });

  it("takes the EARLIEST expiry across contributing grants (conservative)", () => {
    const soon = new Date(Date.now() + 60_000);
    const later = new Date(Date.now() + 3_600_000);
    const rows = mergeVisibleSet([
      hit({ scope: "apply", expiresAt: later }),
      hit({ scope: "retrieve", expiresAt: soon }),
    ]);
    expect(rows[0]!.expiresAt).toEqual(soon);
  });

  it("a perpetual grant does not inherit a sibling's expiry ceiling upward", () => {
    // merged row still expires at the earliest contributing expiry — the
    // recompute after that point restores the surviving weaker/equal scope.
    const soon = new Date(Date.now() + 60_000);
    const rows = mergeVisibleSet([
      hit({ scope: "retrieve", expiresAt: null }),
      hit({ scope: "apply", expiresAt: soon }),
    ]);
    expect(rows[0]!.scope).toBe("apply");
    expect(rows[0]!.expiresAt).toEqual(soon);
  });
});

describe("isFresh (lazy TTL anchor)", () => {
  it("fresh within the window, stale outside, missing = stale", () => {
    const now = new Date("2026-07-07T00:01:00Z");
    expect(isFresh(new Date("2026-07-07T00:00:45Z"), 30, now)).toBe(true);
    expect(isFresh(new Date("2026-07-07T00:00:15Z"), 30, now)).toBe(false);
    expect(isFresh(null, 30, now)).toBe(false);
  });
});

describe("toVisibleResource projection", () => {
  it("projects codes and ISO expiry", () => {
    const [row] = mergeVisibleSet([
      hit({ expiresAt: new Date("2026-08-01T00:00:00Z") }),
    ]);
    expect(toVisibleResource(row!)).toEqual({
      resource_type: "knowledge_base",
      resource_product: "karda",
      resource_workspace_id: "ws-owner",
      resource_ref: "kb-1",
      scope: "retrieve",
      expires_at: "2026-08-01T00:00:00.000Z",
    });
  });
});
