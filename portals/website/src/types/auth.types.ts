/**
 * 认证类型定义
 * @package @vxture/website
 * @layer Presentation
 * @category Types
 */

export interface UserInfo {
  id: string;
  name: string;
  displayName?: string | null;
  username?: string;
  /** Platform avatar URL (versioned); null/absent → default silhouette. */
  picture?: string | null;
  avatarUrl?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  roleLabel?: string;
  personalVerified?: boolean | null;
  organizationVerified?: boolean | null;
  organizationName?: string | null;
  tenantType?: "individual" | "company" | "organization" | string | null;
  /** Whether this login/signup auto-created the account; frontend may prompt for a nickname. */
  isNewAccount?: boolean;
}

export interface RestoreSessionOptions {
  silent?: boolean;
}

export interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Methods
  setUser: (user: UserInfo | null) => void;
  restoreSession: (options?: RestoreSessionOptions) => Promise<UserInfo | null>;
  clearError: () => void;
}
