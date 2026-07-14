/**
 * mfa-policy.ts — operator MFA policy resolution (pure, no I/O).
 * @package @vxture/service-iam
 * @layer Domain
 *
 * The effective MFA requirement for an operator login is the STRICTEST of three
 * independent inputs (identity-platform-operator.md §2.2):
 *
 *   effective = max( platform default (admin.setting: operator.mfa.policy),
 *                    role floor        (admin.operator_role.mfa_min_level),
 *                    personal override (admin.operator_mfa.policy) )
 *
 * Ordering: disabled < optional < required. From the effective policy plus the
 * operator's enrollment state, the two-step login state machine (§3.2, P2.2)
 * derives whether this login must complete a second factor, and whether it must
 * first run the enroll-on-login ceremony (Required but nothing enrolled yet).
 *
 * Pure functions only — the DB reads that gather these inputs live in the repo
 * layer; this module is fully unit-testable and shared by the IdP login flow.
 */

/** MFA policy tri-state, least → most strict. */
export type MfaPolicy = "disabled" | "optional" | "required";

const POLICY_RANK: Record<MfaPolicy, number> = {
  disabled: 0,
  optional: 1,
  required: 2,
};

/**
 * Coerce a raw policy value to a known tri-state. Unrecognized / null / empty →
 * `disabled` (rank 0) so a missing or malformed input is NON-CONTRIBUTING to the
 * max — e.g. an operator with no operator_mfa row must not silently raise the
 * floor to `optional`. A genuinely-absent platform default is the caller's
 * concern: it should supply a concrete default (the seed sets `optional`) before
 * resolution, not rely on this coercion.
 */
export function normalizeMfaPolicy(raw: string | null | undefined): MfaPolicy {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "required":
      return "required";
    case "optional":
      return "optional";
    case "disabled":
      return "disabled";
    default:
      return "disabled";
  }
}

/** The three policy inputs feeding the max (each raw; normalized internally). */
export interface MfaPolicyInputs {
  /** Platform default — admin.setting `operator.mfa.policy`. */
  platformDefault?: string | null | undefined;
  /** Role floor — admin.operator_role.mfa_min_level. */
  roleFloor?: string | null | undefined;
  /** Per-operator override — admin.operator_mfa.policy. */
  personal?: string | null | undefined;
}

/** Resolve the effective (strictest) policy across the three inputs. */
export function resolveEffectiveMfaPolicy(inputs: MfaPolicyInputs): MfaPolicy {
  return [inputs.platformDefault, inputs.roleFloor, inputs.personal]
    .map(normalizeMfaPolicy)
    .reduce<MfaPolicy>(
      (acc, p) => (POLICY_RANK[p] > POLICY_RANK[acc] ? p : acc),
      "disabled",
    );
}

/** What second factors the operator currently has registered + hard requirements. */
export interface MfaEnrollmentState {
  /** admin.operator_mfa.totp_enabled. */
  totpEnabled: boolean;
  /** count(admin.operator_webauthn_credential). */
  webauthnCredentialCount: number;
  /**
   * admin.operator_mfa.webauthn_required — high-privilege operators MUST use a
   * WebAuthn passkey (TOTP/recovery are not accepted) and MFA is forced on,
   * regardless of the resolved policy (identity-platform-operator.md §2.1).
   */
  webauthnRequired?: boolean | undefined;
}

/** True when the operator has at least one usable second factor. */
export function isMfaEnrolled(state: MfaEnrollmentState): boolean {
  return state.totpEnabled || state.webauthnCredentialCount > 0;
}

/** The login-flow decision derived from policy + enrollment. */
export interface MfaDecision {
  /** Strictest policy in effect for this operator. */
  effectivePolicy: MfaPolicy;
  /** This login must complete a second factor before a session is issued. */
  mfaRequired: boolean;
  /** Policy/required-factor obligation unmet (no usable factor) → enroll-on-login. */
  enrollRequired: boolean;
  /** High-privilege: only a WebAuthn passkey satisfies the second factor. */
  webauthnRequired: boolean;
  /** Which factor the enroll-on-login ceremony must register (null when enrolled). */
  enrollFactor: "totp" | "webauthn" | null;
}

/**
 * Decide the MFA obligations for a login (identity-platform-operator.md §2.1/§2.2).
 *
 * High-privilege (webauthn_required) operators are handled first: MFA is forced
 * and only a passkey counts — if none is registered, enroll-on-login registers a
 * passkey. Otherwise the policy matrix applies:
 *   - disabled              → no second factor.
 *   - optional + enrolled   → second factor required (use the registered factor).
 *   - optional + unenrolled → no second factor (pass; UI nudges to enroll later).
 *   - required + enrolled   → second factor required.
 *   - required + unenrolled → second factor required, via TOTP enroll-on-login.
 */
export function decideMfa(
  inputs: MfaPolicyInputs,
  enrollment: MfaEnrollmentState,
): MfaDecision {
  const effectivePolicy = resolveEffectiveMfaPolicy(inputs);

  if (enrollment.webauthnRequired === true) {
    const hasWebauthn = enrollment.webauthnCredentialCount > 0;
    return {
      // webauthn_required implies MFA is mandatory, regardless of policy.
      effectivePolicy: "required",
      mfaRequired: true,
      enrollRequired: !hasWebauthn,
      webauthnRequired: true,
      enrollFactor: hasWebauthn ? null : "webauthn",
    };
  }

  const enrolled = isMfaEnrolled(enrollment);
  const mfaRequired =
    effectivePolicy === "required" ||
    (effectivePolicy === "optional" && enrolled);
  const enrollRequired = effectivePolicy === "required" && !enrolled;
  return {
    effectivePolicy,
    mfaRequired,
    enrollRequired,
    webauthnRequired: false,
    enrollFactor: enrollRequired ? "totp" : null,
  };
}
