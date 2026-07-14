/**
 * auth.types.ts - 认证类型定义
 * @package @vxture/bff-auth
 */

export interface AuthUserDto {
  id: string;
  name: string;
  displayName?: string | null;
  username?: string;
  email: string;
  phone?: string | null;
  role: string;
  roleLabel?: string;
  personalVerified?: boolean | null;
  organizationVerified?: boolean | null;
  organizationName?: string | null;
  tenantType?: "individual" | "company" | "organization" | string | null;
  /** Whether this login auto-created the account (phone-code unified registration); frontend may prompt for a nickname. */
  isNewAccount?: boolean;
}

export interface AuthResultDto {
  userId: string;
  status: "authenticated";
  tenantId?: string;
}
