// ── Admin ─────────────────────────────────────────────────────────────────

export interface AdminRecord {
  id: string;
  roleId: string;
  username: string;
  status: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  passwordHash: string;
  loginFailureCount: number;
  remark: string | null;
  lastLoginIp: string | null;
  isSystem: boolean;
  mfaEnabled: boolean;
  lockedUntil: Date | null;
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
  sort: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AdminView extends Omit<AdminRecord, "passwordHash"> {
  roleName?: string;
}

export interface ListAdminsParams {
  status?: string;
  roleId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAdminsResult {
  items: AdminView[];
  total: number;
}

export interface CreateAdminInput {
  roleId: string;
  username: string;
  email?: string;
  phone?: string;
  displayName?: string;
  passwordHash: string;
  remark?: string;
  sort?: number;
  createdBy?: string;
}

export interface UpdateAdminInput {
  roleId?: string;
  status?: string;
  email?: string;
  phone?: string;
  displayName?: string;
  remark?: string;
  sort?: number;
  updatedBy?: string;
}

// ── Role ──────────────────────────────────────────────────────────────────

export interface RoleRecord {
  id: string;
  roleCode: string;
  status: string;
  nameEn: string;
  nameI18nKey: string;
  description: string;
  descriptionI18nKey: string | null;
  isSystem: boolean;
  sort: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDetail extends RoleRecord {
  permissions: PermissionRecord[];
}

export interface CreateRoleInput {
  roleCode: string;
  nameEn: string;
  nameI18nKey: string;
  description?: string;
  descriptionI18nKey?: string;
  sort?: number;
  createdBy?: string;
}

// ── Permission ────────────────────────────────────────────────────────────

export interface PermissionRecord {
  id: string;
  parentId: string | null;
  permCode: string;
  permType: string;
  permName: string;
  routePath: string | null;
  component: string | null;
  icon: string | null;
  description: string;
  isActive: boolean;
  isVisible: boolean;
  sort: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Setting ───────────────────────────────────────────────────────────────

export interface SettingRecord {
  id: string;
  configGroup: string;
  configKey: string;
  valueType: string;
  configValue: string;
  isSensitive: boolean;
  isEncrypted: boolean;
  isReadonly: boolean;
  validationRule: string | null;
  description: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Governance Record ─────────────────────────────────────────────────────

export interface GovernanceRecord {
  id: string;
  kind: string;
  name: string;
  status: string;
  scope: string;
  owner: string;
  policy: string;
  description: string;
  tags: string[];
  sourceTable: string | null;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListGovernanceParams {
  kind?: string;
  status?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface UpsertGovernanceInput {
  id: string;
  kind: string;
  name: string;
  status?: string;
  scope: string;
  owner: string;
  policy: string;
  description?: string;
  tags?: string[];
  sourceTable?: string;
  sourceId?: string;
}

// ── Announcement ──────────────────────────────────────────────────────────

export interface AnnouncementRecord {
  id: string;
  announcementType: string;
  severity: string;
  status: string;
  lang: string;
  title: string;
  content: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  targetPlans: string[];
  targetTenantTypes: string[];
  isDismissible: boolean;
  publishAt: Date;
  expiresAt: Date | null;
  meta: Record<string, unknown> | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListAnnouncementsParams {
  status?: string;
  announcementType?: string;
  lang?: string;
  page?: number;
  pageSize?: number;
}
