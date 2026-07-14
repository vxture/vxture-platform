import { describe, it, expect } from "vitest";
import { isWebauthnCounterRegression } from "./webauthn-counter";

describe("isWebauthnCounterRegression", () => {
  it("allows a strictly advancing counter", () => {
    expect(isWebauthnCounterRegression(5, 6)).toBe(false);
    expect(isWebauthnCounterRegression(0, 1)).toBe(false);
  });

  it("rejects a non-advancing counter when the authenticator uses counters", () => {
    expect(isWebauthnCounterRegression(5, 5)).toBe(true); // replay (no advance)
    expect(isWebauthnCounterRegression(5, 3)).toBe(true); // rollback / clone
    expect(isWebauthnCounterRegression(5, 0)).toBe(true); // clone reporting 0
  });

  it("treats a 0/0 pair as normal (counter-less authenticator)", () => {
    expect(isWebauthnCounterRegression(0, 0)).toBe(false);
  });
});
