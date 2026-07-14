import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { generatePkce, pkceChallenge, randomToken, safeReturnTo } from "./pkce";

describe("generatePkce / pkceChallenge", () => {
  it("produces a verifier whose S256 challenge matches", () => {
    const { verifier, challenge } = generatePkce();
    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(challenge).toBe(expected);
    expect(pkceChallenge(verifier)).toBe(challenge);
  });

  it("verifier length is within the RFC 7636 43–128 range", () => {
    const { verifier } = generatePkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it("generates distinct pairs", () => {
    expect(generatePkce().verifier).not.toBe(generatePkce().verifier);
  });
});

describe("randomToken", () => {
  it("is url-safe and unique", () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t).not.toBe(randomToken());
  });
});

describe("safeReturnTo", () => {
  const allowed = ["https://console.vxture.com"];
  const fallback = "https://console.vxture.com/";

  it("allows a returnTo on an allowed origin", () => {
    const u = "https://console.vxture.com/dashboard";
    expect(safeReturnTo(u, allowed, fallback)).toBe(u);
  });

  it("rejects a foreign origin (open-redirect guard)", () => {
    expect(safeReturnTo("https://evil.example/x", allowed, fallback)).toBe(
      fallback,
    );
  });

  it("rejects garbage / missing and returns the fallback", () => {
    expect(safeReturnTo("not a url", allowed, fallback)).toBe(fallback);
    expect(safeReturnTo(undefined, allowed, fallback)).toBe(fallback);
  });
});
