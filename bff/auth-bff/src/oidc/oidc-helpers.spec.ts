import { createHash, randomBytes } from "node:crypto";
import { describe, it, expect } from "vitest";
import { stripSubPrefix, verifyPkceS256 } from "./oidc.service";

// Build a valid PKCE pair the same way an RP would.
function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("hex");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

describe("verifyPkceS256", () => {
  it("accepts a correct verifier", () => {
    const { verifier, challenge } = pkcePair();
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it("rejects a wrong verifier", () => {
    const { challenge } = pkcePair();
    expect(verifyPkceS256("not-the-verifier", challenge)).toBe(false);
  });

  it("rejects empty verifier or challenge", () => {
    const { verifier, challenge } = pkcePair();
    expect(verifyPkceS256("", challenge)).toBe(false);
    expect(verifyPkceS256(verifier, "")).toBe(false);
  });

  it("is not fooled by a plain (non-hashed) challenge", () => {
    const verifier = randomBytes(32).toString("hex");
    // A client that mistakenly sent the verifier as the challenge must fail S256.
    expect(verifyPkceS256(verifier, verifier)).toBe(false);
  });
});

describe("stripSubPrefix", () => {
  it("strips usr_ and opr_ namespaces", () => {
    expect(stripSubPrefix("usr_abc-123")).toBe("abc-123");
    expect(stripSubPrefix("opr_def-456")).toBe("def-456");
  });

  it("returns the input unchanged when no prefix", () => {
    expect(stripSubPrefix("plainid")).toBe("plainid");
  });

  it("only strips at the first underscore", () => {
    expect(stripSubPrefix("usr_a_b")).toBe("a_b");
  });
});
