import { describe, it, expect } from "vitest";
import {
  decideMfa,
  isMfaEnrolled,
  normalizeMfaPolicy,
  resolveEffectiveMfaPolicy,
  type MfaPolicy,
} from "./mfa-policy";

describe("normalizeMfaPolicy", () => {
  it("passes through the three known states (case/space-insensitive)", () => {
    expect(normalizeMfaPolicy("required")).toBe("required");
    expect(normalizeMfaPolicy(" Optional ")).toBe("optional");
    expect(normalizeMfaPolicy("DISABLED")).toBe("disabled");
  });

  it("coerces unknown/null/empty to disabled (non-contributing)", () => {
    expect(normalizeMfaPolicy(null)).toBe("disabled");
    expect(normalizeMfaPolicy(undefined)).toBe("disabled");
    expect(normalizeMfaPolicy("")).toBe("disabled");
    expect(normalizeMfaPolicy("enforced")).toBe("disabled");
  });
});

describe("resolveEffectiveMfaPolicy — strictest of three", () => {
  it("takes the max rank across inputs", () => {
    expect(
      resolveEffectiveMfaPolicy({
        platformDefault: "optional",
        roleFloor: "disabled",
        personal: "disabled",
      }),
    ).toBe("optional");

    expect(
      resolveEffectiveMfaPolicy({
        platformDefault: "optional",
        roleFloor: "required",
        personal: "disabled",
      }),
    ).toBe("required");

    expect(
      resolveEffectiveMfaPolicy({
        platformDefault: "disabled",
        roleFloor: "disabled",
        personal: "required",
      }),
    ).toBe("required");
  });

  it("personal override cannot WEAKEN a stricter platform/role policy", () => {
    expect(
      resolveEffectiveMfaPolicy({
        platformDefault: "required",
        roleFloor: "optional",
        personal: "disabled",
      }),
    ).toBe("required");
  });

  it("all-disabled (or all-missing) resolves to disabled", () => {
    expect(
      resolveEffectiveMfaPolicy({
        platformDefault: "disabled",
        roleFloor: "disabled",
        personal: "disabled",
      }),
    ).toBe("disabled");
    expect(resolveEffectiveMfaPolicy({})).toBe("disabled");
  });

  it("a missing personal override does not raise the floor", () => {
    // operator with no operator_mfa row: personal undefined must not become optional.
    expect(
      resolveEffectiveMfaPolicy({
        platformDefault: "disabled",
        roleFloor: "disabled",
        personal: undefined,
      }),
    ).toBe("disabled");
  });
});

describe("isMfaEnrolled", () => {
  it("true when TOTP enabled or any webauthn credential exists", () => {
    expect(
      isMfaEnrolled({ totpEnabled: true, webauthnCredentialCount: 0 }),
    ).toBe(true);
    expect(
      isMfaEnrolled({ totpEnabled: false, webauthnCredentialCount: 2 }),
    ).toBe(true);
  });

  it("false when no factor is registered", () => {
    expect(
      isMfaEnrolled({ totpEnabled: false, webauthnCredentialCount: 0 }),
    ).toBe(false);
  });
});

describe("decideMfa — §2.2 matrix", () => {
  const unenrolled = { totpEnabled: false, webauthnCredentialCount: 0 };
  const enrolled = { totpEnabled: true, webauthnCredentialCount: 0 };
  const only = (personal: MfaPolicy) => ({ personal });

  it("disabled → no second factor, no enroll", () => {
    expect(decideMfa(only("disabled"), unenrolled)).toEqual({
      effectivePolicy: "disabled",
      mfaRequired: false,
      enrollRequired: false,
      webauthnRequired: false,
      enrollFactor: null,
    });
  });

  it("optional + unenrolled → pass (no factor, no enroll)", () => {
    expect(decideMfa(only("optional"), unenrolled)).toEqual({
      effectivePolicy: "optional",
      mfaRequired: false,
      enrollRequired: false,
      webauthnRequired: false,
      enrollFactor: null,
    });
  });

  it("optional + enrolled → second factor required, no enroll", () => {
    expect(decideMfa(only("optional"), enrolled)).toEqual({
      effectivePolicy: "optional",
      mfaRequired: true,
      enrollRequired: false,
      webauthnRequired: false,
      enrollFactor: null,
    });
  });

  it("required + enrolled → second factor required, no enroll", () => {
    expect(decideMfa(only("required"), enrolled)).toEqual({
      effectivePolicy: "required",
      mfaRequired: true,
      enrollRequired: false,
      webauthnRequired: false,
      enrollFactor: null,
    });
  });

  it("required + unenrolled → TOTP enroll-on-login then second factor", () => {
    expect(decideMfa(only("required"), unenrolled)).toEqual({
      effectivePolicy: "required",
      mfaRequired: true,
      enrollRequired: true,
      webauthnRequired: false,
      enrollFactor: "totp",
    });
  });

  it("role floor required drives the decision regardless of personal", () => {
    expect(
      decideMfa(
        { platformDefault: "optional", roleFloor: "required", personal: null },
        unenrolled,
      ),
    ).toEqual({
      effectivePolicy: "required",
      mfaRequired: true,
      enrollRequired: true,
      webauthnRequired: false,
      enrollFactor: "totp",
    });
  });

  it("webauthn_required + no passkey → forced webauthn enroll-on-login (overrides policy)", () => {
    expect(
      decideMfa(only("disabled"), {
        totpEnabled: false,
        webauthnCredentialCount: 0,
        webauthnRequired: true,
      }),
    ).toEqual({
      effectivePolicy: "required",
      mfaRequired: true,
      enrollRequired: true,
      webauthnRequired: true,
      enrollFactor: "webauthn",
    });
  });

  it("webauthn_required + passkey present → webauthn verify required, no enroll", () => {
    expect(
      decideMfa(only("optional"), {
        totpEnabled: true, // a registered TOTP must NOT satisfy a webauthn-required operator
        webauthnCredentialCount: 1,
        webauthnRequired: true,
      }),
    ).toEqual({
      effectivePolicy: "required",
      mfaRequired: true,
      enrollRequired: false,
      webauthnRequired: true,
      enrollFactor: null,
    });
  });
});
