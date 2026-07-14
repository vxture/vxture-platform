export { IamModule } from "./module/iam.module";
export { PgOAuthProviderRepository } from "./repository";
export type { OAuthProviderConfig } from "./repository";
export {
  PgOidcClientRepository,
  PgSigningKeyRepository,
  PgEntitlementRepository,
  PgOperatorRepository,
  PgOperatorAuditRepository,
} from "./repository";
export type {
  OidcClientConfig,
  OidcClientInfo,
  EntitlementRow,
  OperatorView,
  OperatorMfaContext,
  OperatorWebauthnCredentialSummary,
  InsertOperatorWebauthnCredential,
  OperatorWebauthnCredentialForAuth,
  OperatorWebauthnCredentialDetail,
} from "./repository";
export {
  decideMfa,
  isMfaEnrolled,
  normalizeMfaPolicy,
  resolveEffectiveMfaPolicy,
} from "./operator-mfa/mfa-policy";
export type {
  MfaDecision,
  MfaEnrollmentState,
  MfaPolicy,
  MfaPolicyInputs,
} from "./operator-mfa/mfa-policy";
export {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
} from "./operator-mfa/totp";
export {
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "./operator-mfa/recovery-code";
export { authMethodToAmr } from "./operator-mfa/amr";
export { isWebauthnCounterRegression } from "./operator-mfa/webauthn-counter";
export { detectLoginAnomalies } from "./operator-mfa/login-anomaly";
export type {
  OperatorLoginHistory,
  OperatorLoginContext,
} from "./operator-mfa/login-anomaly";
