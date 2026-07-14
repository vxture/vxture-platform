import type { JwtAccessPayload } from "@vxture/core-auth";

export type Capability =
  | "platform.tenant.manage"
  | "platform.product.manage"
  | "platform.pricing.manage"
  | "platform.model.manage"
  | "tenant.user.manage"
  | "tenant.role.manage"
  | "tenant.subscription.read"
  | "tenant.billing.read"
  | "tenant.invoice.manage"
  | "tenant.payment.manage"
  | "tenant.quota.read";

export interface ConsoleUser {
  id: string;
  name: string;
  displayName?: string | null;
  email: string;
  roleLabel: string;
  username?: string;
  phone?: string | null;
}

export interface ConsoleUserProfile {
  id: string;
  username: string;
  /** ISO timestamp when the username may next be changed; null = changeable now. */
  usernameChangeableAt: string | null;
  displayName: string | null;
  /** Platform avatar URL (versioned `/avatar/usr_<id>?v=<hash>`); null → default. */
  picture: string | null;
  /** @deprecated legacy paste-URL field; superseded by `picture` (always null). */
  avatarUrl: string | null;
  bio: string | null;
  email: string | null;
  /** Whether the email is verified. */
  emailVerified: boolean;
  phone: string | null;
  /** Whether the phone is verified (the mandatory anchor → normally true). */
  phoneVerified: boolean;
  /** Whether username+password login is disabled (other login paths unaffected). */
  accountLoginDisabled?: boolean;
  timezone: string | null;
  language: string | null;
  profileUpdatedAt: string | null;
  /** Stable public user number (bigint as string), e.g. "1024". */
  userNo: string | null;
  /** ISO timestamp of account creation. */
  accountCreatedAt: string | null;
  /** Account status: active | suspended. */
  accountStatus?: string | null;
}

export interface ConsoleOrganizationProfile {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  displayName: string;
  tenantType: "personal" | "organization";
  status: "trial" | "active" | "suspended" | "cancelled";
  createdAt: string | null;
  /** Content hash of the stored logo; null = no custom logo. FE builds the URL. */
  logoHash: string | null;
  description: string | null;
  industry: string | null;
  scale: string | null;
  website: string | null;
  // Contact / admin (§3.3)
  contactName: string | null;
  contactRole: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  countryCode: string | null;
  address: string | null;
  postalCode: string | null;
  isBillingRecipient: boolean;
  // Localization (§3.6)
  timezone: string | null;
  language: string | null;
  currency: string | null;
  // Verification (KYC §3.4) — deferred; read-only summary, skeleton only.
  verifiedStatus: "unverified" | "pending" | "verified" | "rejected" | null;
  updatedAt: string | null;
}

export interface ConsoleTenantRole {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  status: "active" | "disabled";
  isSystem: boolean;
  permissions: ConsoleTenantPermission[];
}

export interface ConsoleTenantPermission {
  id: string;
  permissionCode: string;
  permissionName: string;
  permissionType: string | null;
  description: string | null;
}

export interface MemberRecord {
  id: string;
  accountId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
  role: string;
  roleCode: string | null;
  roleId: string | null;
  status: "Active" | "Invited" | "Suspended";
  statusCode: "active" | "inactive" | "banned";
  lastActive: string;
  team: string;
  joinedAt: string;
  isPrimaryOwner: boolean;
}

export interface TenantContext {
  id: string;
  name: string;
  mode: "platform" | "tenant";
  workspace: string;
  tenantType?: "personal" | "organization";
  tenantCode?: string;
  status?: string;
}

export interface RequestContext {
  auth?: JwtAccessPayload;
  user?: ConsoleUser;
  tenant?: TenantContext;
  capabilities?: Capability[];
}

/** A tenant/workspace the user belongs to (my-workspaces, §1.6/§4.1). */
export interface ConsoleWorkspaceItem {
  tenantId: string;
  tenantName: string;
  tenantType: "personal" | "organization";
  role: string;
  workspaceId: string | null;
  workspaceName: string | null;
  isCurrent: boolean;
  /** ISO timestamp the user joined this tenant (tenant_membership.created_at). */
  joinedAt: string | null;
}

export interface AiModelRecord {
  id: string;
  providerId: string | null;
  modelCode: string;
  modelName: string;
  provider: string;
  endpointUrl: string;
  protocol: string;
  capabilities: string[];
  keyReference: {
    source: "env";
    name: string;
    configured: boolean;
  } | null;
  isActive: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type ModelApplicationType =
  | "agent"
  | "workflow"
  | "api_client"
  | "internal_service";

export interface AiModelGrantRecord {
  id: string;
  modelId: string;
  tenantId: string;
  applicationId: string | null;
  applicationType: ModelApplicationType | null;
  agentId: string | null;
  priority: number;
  reason: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantQuotaRecord {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  quotaCycle: string;
  periodStart: string | null;
  periodEnd: string | null;
  maxUsers: number | null;
  maxAgents: number | null;
  maxKnowledgeBases: number | null;
  maxStorageGb: number | null;
  periodTokens: string | null;
  usedTokens: string;
  allowedModelIds: string[];
  allowCustomModel: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUsageSummaryRecord {
  id: string;
  tenantId: string;
  applicationId: string | null;
  applicationType: ModelApplicationType | null;
  cycleMonth: string;
  statType: string;
  totalRequests: string;
  successRequests: string;
  failedRequests: string;
  totalInputTokens: string;
  totalOutputTokens: string;
  totalTokens: string;
  totalCostAmount: string;
  currency: string;
  updatedAt: string;
}
