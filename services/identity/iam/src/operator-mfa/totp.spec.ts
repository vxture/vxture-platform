import { describe, it, expect } from "vitest";
import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
} from "./totp";

// RFC 6238 Appendix B seed: ASCII "12345678901234567890" (20 bytes, SHA1).
const RFC_SEED = base32Encode(Buffer.from("12345678901234567890", "ascii"));

describe("base32 round-trip", () => {
  it("encodes then decodes back to the original bytes", () => {
    const bytes = Buffer.from("12345678901234567890", "ascii");
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
  });

  it("is whitespace/padding/case tolerant", () => {
    const enc = base32Encode(Buffer.from("hello world!", "ascii"));
    const noisy = `${enc.toLowerCase().slice(0, 4)} ${enc.slice(4)}====`;
    expect(base32Decode(noisy).toString("ascii")).toBe("hello world!");
  });

  it("rejects an invalid character", () => {
    expect(() => base32Decode("ABC!")).toThrow("invalid base32 character");
  });
});

describe("generateTotp — RFC 6238 test vectors (SHA1, 8 digits)", () => {
  const cases: Array<[number, string]> = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];
  for (const [ts, expected] of cases) {
    it(`T=${ts} → ${expected}`, () => {
      expect(generateTotp(RFC_SEED, { timestamp: ts, digits: 8 })).toBe(
        expected,
      );
    });
  }
});

describe("verifyTotp", () => {
  const secret = generateTotpSecret();

  it("accepts a freshly generated code at the same timestamp", () => {
    const ts = 1_700_000_000;
    const code = generateTotp(secret, { timestamp: ts });
    expect(verifyTotp(secret, code, { timestamp: ts })).toBe(true);
  });

  it("accepts a code from the previous/next step within ±1 window", () => {
    const ts = 1_700_000_000;
    const prev = generateTotp(secret, { timestamp: ts - 30 });
    const next = generateTotp(secret, { timestamp: ts + 30 });
    expect(verifyTotp(secret, prev, { timestamp: ts, window: 1 })).toBe(true);
    expect(verifyTotp(secret, next, { timestamp: ts, window: 1 })).toBe(true);
  });

  it("rejects a code two steps away with ±1 window", () => {
    const ts = 1_700_000_000;
    const stale = generateTotp(secret, { timestamp: ts - 90 });
    expect(verifyTotp(secret, stale, { timestamp: ts, window: 1 })).toBe(false);
  });

  it("rejects a wrong / malformed code", () => {
    const ts = 1_700_000_000;
    expect(verifyTotp(secret, "000000", { timestamp: ts })).toBe(false);
    expect(verifyTotp(secret, "12345", { timestamp: ts })).toBe(false); // too short
    expect(verifyTotp(secret, "abcdef", { timestamp: ts })).toBe(false); // non-digit
    expect(verifyTotp(secret, "", { timestamp: ts })).toBe(false);
  });
});

describe("buildOtpauthUri", () => {
  it("emits a scannable otpauth URI with issuer + label + secret", () => {
    const uri = buildOtpauthUri({
      secret: "JBSWY3DPEHPK3PXP",
      accountName: "superadmin",
      issuer: "Vxture",
    });
    expect(uri.startsWith("otpauth://totp/Vxture%3Asuperadmin?")).toBe(true);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=Vxture");
    expect(uri).toContain("algorithm=SHA1");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});
