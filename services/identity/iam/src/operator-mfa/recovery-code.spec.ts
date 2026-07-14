import { describe, it, expect } from "vitest";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "./recovery-code";

describe("generateRecoveryCodes", () => {
  it("generates the requested count of distinct, dash-grouped codes", () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{1,4})+$/);
    }
  });

  it("honours a custom count", () => {
    expect(generateRecoveryCodes(3)).toHaveLength(3);
  });
});

describe("normalizeRecoveryCode", () => {
  it("strips dashes/whitespace and upper-cases", () => {
    expect(normalizeRecoveryCode("abcd-ef gh")).toBe("ABCDEFGH");
    expect(normalizeRecoveryCode("")).toBe("");
  });
});

describe("hashRecoveryCode", () => {
  it("is stable across display formatting (dashes/case)", () => {
    const code = generateRecoveryCodes(1)[0]!;
    const noisy = ` ${code.toLowerCase().replace(/-/g, "")} `;
    expect(hashRecoveryCode(code)).toBe(hashRecoveryCode(noisy));
  });

  it("differs for different codes and is a 64-char hex digest", () => {
    const [a, b] = generateRecoveryCodes(2);
    expect(hashRecoveryCode(a!)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRecoveryCode(a!)).not.toBe(hashRecoveryCode(b!));
  });
});
