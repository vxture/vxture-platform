/**
 * operator-secret-cipher.ts — AES-256-GCM for operator secrets at rest.
 * @package @vxture/bff-auth
 *
 * Encrypts the operator TOTP secret before it lands in admin.operator_mfa.totp_secret
 * (identity-platform-operator.md §6.1/§9): the base32 plaintext is never stored.
 * The key comes from OPERATOR_TOTP_ENC_KEY (config), derived to 32 bytes via
 * SHA-256 so any sufficiently-long secret works. Wire format (base64, fits
 * varchar(255)): v1.<iv>.<tag>.<ciphertext>.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;

/** Derive the 32-byte AES key from the configured secret. */
export function deriveSecretKey(rawKey: string): Buffer {
  return createHash("sha256").update(rawKey, "utf8").digest();
}

/** Encrypt a plaintext secret → `v1.<iv>.<tag>.<ct>` (all base64). */
export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(".");
}

/** Decrypt a `v1.<iv>.<tag>.<ct>` payload; throws on tamper/format/key mismatch. */
export function decryptSecret(payload: string, key: Buffer): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("invalid_secret_ciphertext");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64!, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64!, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64!, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
