/**
 * recovery-code.ts — operator MFA recovery codes (generate / normalize / hash).
 * @package @vxture/service-iam
 * @layer Domain
 *
 * Single-use rescue codes issued at MFA enrollment (identity-platform-operator.md
 * §2.1/§6.3), shown to the operator ONCE. Each code is 128 bits of entropy
 * (16 random bytes, base32, dash-grouped for readability). At rest only the
 * SHA-256 hash of the normalized code is stored: the high entropy makes a fast
 * hash safe against offline guessing and lets the repo verify with an O(1)
 * indexed lookup (no per-row slow-hash compare). Normalization strips the
 * display dashes and upper-cases, so the operator can type with or without them.
 */
import { createHash, randomBytes } from "node:crypto";
import { base32Encode } from "./totp";

const DEFAULT_COUNT = 10;
const BYTES_PER_CODE = 16; // 128 bits

/** Generate a batch of fresh, distinct recovery codes (display form). */
export function generateRecoveryCodes(count = DEFAULT_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(formatRecoveryCode(base32Encode(randomBytes(BYTES_PER_CODE))));
  }
  return [...codes];
}

/** Group a raw base32 string into 4-char dash-separated chunks. */
function formatRecoveryCode(raw: string): string {
  return (raw.match(/.{1,4}/g) ?? [raw]).join("-");
}

/** Strip display formatting → canonical form for hashing/compare. */
export function normalizeRecoveryCode(code: string): string {
  return (code ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** SHA-256 hash (hex) of the normalized code — what is stored / looked up. */
export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}
