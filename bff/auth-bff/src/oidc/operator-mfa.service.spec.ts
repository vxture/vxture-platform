import { describe, it, expect } from "vitest";
import { generateTotp } from "@vxture/service-iam";
import type {
  OperatorMfaContext,
  PgOperatorRepository,
} from "@vxture/service-iam";
import type { VxConfigService } from "@vxture/core-config";
import { OperatorMfaService } from "./operator-mfa.service";

const ENC_KEY = "test-operator-totp-encryption-key-0123456789";

/** A VxConfigService stub exposing only the auth keys the service reads. */
function fakeConfig(encKey: string | undefined): VxConfigService {
  return {
    auth: { OPERATOR_TOTP_ENC_KEY: encKey },
  } as unknown as VxConfigService;
}

/** Build the service over a stub repo returning a fixed MFA context. */
function serviceWith(ctx: OperatorMfaContext | null): OperatorMfaService {
  const repo = {
    getMfaContext: async () => ctx,
  } as unknown as PgOperatorRepository;
  return new OperatorMfaService(repo, fakeConfig(ENC_KEY));
}

const ctx = (over: Partial<OperatorMfaContext> = {}): OperatorMfaContext => ({
  platformDefault: "optional",
  roleFloor: "disabled",
  personalPolicy: null,
  totpEnabled: false,
  webauthnCredentialCount: 0,
  webauthnRequired: false,
  ...over,
});

describe("OperatorMfaService.resolveLoginMfa", () => {
  it("unknown operator → no MFA, no methods (fails downstream, not here)", async () => {
    const r = await serviceWith(null).resolveLoginMfa("opr_missing");
    expect(r.decision).toEqual({
      effectivePolicy: "disabled",
      mfaRequired: false,
      enrollRequired: false,
      webauthnRequired: false,
      enrollFactor: null,
    });
    expect(r.methods).toEqual([]);
  });

  it("optional + unenrolled → pass (no second factor)", async () => {
    const r = await serviceWith(
      ctx({ platformDefault: "optional" }),
    ).resolveLoginMfa("opr_1");
    expect(r.decision.mfaRequired).toBe(false);
    expect(r.decision.enrollRequired).toBe(false);
    expect(r.methods).toEqual([]);
  });

  it("optional + TOTP enrolled → second factor required, methods=[totp]", async () => {
    const r = await serviceWith(
      ctx({ platformDefault: "optional", totpEnabled: true }),
    ).resolveLoginMfa("opr_1");
    expect(r.decision.mfaRequired).toBe(true);
    expect(r.decision.enrollRequired).toBe(false);
    expect(r.methods).toEqual(["totp"]);
  });

  it("required + unenrolled → enroll-on-login, methods empty", async () => {
    const r = await serviceWith(ctx({ roleFloor: "required" })).resolveLoginMfa(
      "opr_1",
    );
    expect(r.decision).toEqual({
      effectivePolicy: "required",
      mfaRequired: true,
      enrollRequired: true,
      webauthnRequired: false,
      enrollFactor: "totp",
    });
    expect(r.methods).toEqual([]);
  });

  it("required + TOTP + WebAuthn enrolled → methods=[totp, webauthn]", async () => {
    const r = await serviceWith(
      ctx({
        roleFloor: "required",
        totpEnabled: true,
        webauthnCredentialCount: 2,
      }),
    ).resolveLoginMfa("opr_1");
    expect(r.decision.mfaRequired).toBe(true);
    expect(r.decision.enrollRequired).toBe(false);
    expect(r.methods).toEqual(["totp", "webauthn"]);
  });
});

describe("OperatorMfaService.resolveLoginMfa — webauthn_required (high-privilege)", () => {
  it("with a passkey → only webauthn offered (TOTP/recovery dropped)", async () => {
    const r = await serviceWith(
      ctx({
        webauthnRequired: true,
        totpEnabled: true, // present but must NOT be offered
        webauthnCredentialCount: 1,
      }),
    ).resolveLoginMfa("opr_1");
    expect(r.decision.webauthnRequired).toBe(true);
    expect(r.decision.mfaRequired).toBe(true);
    expect(r.decision.enrollRequired).toBe(false);
    expect(r.methods).toEqual(["webauthn"]);
  });

  it("without a passkey → forced webauthn enroll (methods empty, enrollFactor webauthn)", async () => {
    const r = await serviceWith(
      ctx({ webauthnRequired: true, webauthnCredentialCount: 0 }),
    ).resolveLoginMfa("opr_1");
    expect(r.decision.enrollRequired).toBe(true);
    expect(r.decision.enrollFactor).toBe("webauthn");
    expect(r.methods).toEqual([]);
  });
});

describe("OperatorMfaService.verifySecondFactor (dispatch seam)", () => {
  it("rejects not-yet-implemented methods with unsupported_mfa_method", async () => {
    const svc = serviceWith(ctx());
    for (const method of ["webauthn", "bogus"]) {
      await expect(
        svc.verifySecondFactor({ operatorId: "opr_1", method, code: "000000" }),
      ).rejects.toThrow("unsupported_mfa_method");
    }
  });
});

/** Stateful fake operator repo for the TOTP enroll→verify round-trip. */
function totpRepo(username = "superadmin") {
  let secret: string | null = null;
  let enabled = false;
  let recovery: Array<{ hash: string; used: boolean }> = [];
  return {
    state: () => ({ secret, enabled, recovery }),
    findById: async () => ({
      id: "opr_1",
      username,
      status: "active",
      roleCode: "super_admin",
      email: null,
    }),
    getTotpEnrollment: async () => (secret ? { secret, enabled } : null),
    upsertPendingTotpSecret: async (_id: string, enc: string) => {
      secret = enc;
      enabled = false;
    },
    enableTotp: async () => {
      enabled = true;
    },
    replaceRecoveryCodes: async (_id: string, hashes: string[]) => {
      recovery = hashes.map((hash) => ({ hash, used: false }));
    },
    consumeRecoveryCode: async (_id: string, hash: string) => {
      const row = recovery.find((r) => r.hash === hash && !r.used);
      if (!row) return false;
      row.used = true;
      return true;
    },
  } as unknown as PgOperatorRepository & { state: () => unknown };
}

describe("OperatorMfaService — TOTP enroll + verify", () => {
  it("begin → confirm first code → verify subsequent codes; encrypts at rest", async () => {
    const repo = totpRepo();
    const svc = new OperatorMfaService(repo, fakeConfig(ENC_KEY));

    const { secret, otpauthUri } = await svc.beginTotpEnrollment("opr_1");
    expect(otpauthUri).toContain("otpauth://totp/Vxture%3Asuperadmin");
    // Stored secret is ciphertext (v1.<iv>.<tag>.<ct>), never the base32 plaintext.
    const stored = (repo.state() as { secret: string }).secret;
    expect(stored.startsWith("v1.")).toBe(true);
    expect(stored).not.toContain(secret);

    // Wrong first code does not enable TOTP.
    expect((await svc.confirmTotpEnrollment("opr_1", "000000")).ok).toBe(false);
    expect((repo.state() as { enabled: boolean }).enabled).toBe(false);

    // Correct first code (current time) confirms + enables + issues recovery codes.
    const first = generateTotp(secret);
    const confirmed = await svc.confirmTotpEnrollment("opr_1", first);
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) expect(confirmed.recoveryCodes).toHaveLength(10);
    expect((repo.state() as { enabled: boolean }).enabled).toBe(true);

    // Now a valid TOTP verifies, a wrong one fails.
    const live = generateTotp(secret);
    expect(
      await svc.verifySecondFactor({
        operatorId: "opr_1",
        method: "totp",
        code: live,
      }),
    ).toBe(true);
    expect(
      await svc.verifySecondFactor({
        operatorId: "opr_1",
        method: "totp",
        code: "000000",
      }),
    ).toBe(false);
  });

  it("verifySecondFactor(totp) is false when TOTP is not enabled", async () => {
    const repo = totpRepo();
    const svc = new OperatorMfaService(repo, fakeConfig(ENC_KEY));
    await svc.beginTotpEnrollment("opr_1"); // staged but not confirmed
    expect(
      await svc.verifySecondFactor({
        operatorId: "opr_1",
        method: "totp",
        code: "000000",
      }),
    ).toBe(false);
  });

  it("fails closed when OPERATOR_TOTP_ENC_KEY is unconfigured", async () => {
    const repo = totpRepo();
    const svc = new OperatorMfaService(repo, fakeConfig(undefined));
    await expect(svc.beginTotpEnrollment("opr_1")).rejects.toThrow(
      "operator_totp_unavailable",
    );
  });
});

describe("OperatorMfaService — recovery codes", () => {
  it("issues 10 codes; a code logs in once then is rejected on reuse", async () => {
    const repo = totpRepo();
    const svc = new OperatorMfaService(repo, fakeConfig(ENC_KEY));

    const codes = await svc.issueRecoveryCodes("opr_1");
    expect(codes).toHaveLength(10);
    // Stored as hashes, never plaintext.
    const stored = (repo.state() as { recovery: Array<{ hash: string }> })
      .recovery;
    expect(stored).toHaveLength(10);
    expect(stored.every((r) => /^[0-9a-f]{64}$/.test(r.hash))).toBe(true);
    expect(stored.some((r) => codes.includes(r.hash))).toBe(false);

    const code = codes[0]!;
    expect(
      await svc.verifySecondFactor({
        operatorId: "opr_1",
        method: "recovery",
        code,
      }),
    ).toBe(true);
    // Single-use: the same code is rejected the second time.
    expect(
      await svc.verifySecondFactor({
        operatorId: "opr_1",
        method: "recovery",
        code,
      }),
    ).toBe(false);
    // A different unused code still works (accepts display formatting/case).
    expect(
      await svc.verifySecondFactor({
        operatorId: "opr_1",
        method: "recovery",
        code: codes[1]!.toLowerCase(),
      }),
    ).toBe(true);
  });

  it("rejects an unknown recovery code", async () => {
    const repo = totpRepo();
    const svc = new OperatorMfaService(repo, fakeConfig(ENC_KEY));
    await svc.issueRecoveryCodes("opr_1");
    expect(
      await svc.verifySecondFactor({
        operatorId: "opr_1",
        method: "recovery",
        code: "ZZZZ-ZZZZ-ZZZZ",
      }),
    ).toBe(false);
  });
});
