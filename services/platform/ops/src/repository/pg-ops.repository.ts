import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { OPS_PG_POOL } from "../tokens";
import type {
  AdminRecord,
  AdminView,
  ListAdminsParams,
  ListAdminsResult,
  CreateAdminInput,
  UpdateAdminInput,
  RoleRecord,
  RoleDetail,
  CreateRoleInput,
  PermissionRecord,
  SettingRecord,
  GovernanceRecord,
  ListGovernanceParams,
  UpsertGovernanceInput,
  AnnouncementRecord,
  ListAnnouncementsParams,
} from "../types/ops.types";

interface AdminRow {
  id: string;
  role_id: string;
  username: string;
  status: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  password_hash: string;
  login_failure_count: number;
  remark: string | null;
  last_login_ip: string | null;
  account_type: string;
  mfa_enabled: boolean;
  locked_until: Date | null;
  password_changed_at: Date | null;
  last_login_at: Date | null;
  sort: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  role_name_en?: string;
}
interface RoleRow {
  id: string;
  role_code: string;
  status: string;
  role_name: string;
  role_name_key: string;
  description: string;
  description_key: string | null;
  is_system: boolean;
  sort: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}
interface PermRow {
  id: string;
  parent_id: string | null;
  perm_code: string;
  perm_type: string;
  perm_name: string;
  route_path: string | null;
  component: string | null;
  icon: string | null;
  description: string;
  is_active: boolean;
  is_visible: boolean;
  sort: number;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}
interface SettingRow {
  id: string;
  config_group: string;
  config_key: string;
  value_type: string;
  config_value: string;
  is_sensitive: boolean;
  is_encrypted: boolean;
  is_readonly: boolean;
  validation_rule: string | null;
  description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}
interface GovernanceRow {
  id: string;
  kind: string;
  name: string;
  status: string;
  scope: string;
  owner: string;
  policy: string;
  description: string;
  tags: string[];
  source_table: string | null;
  source_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
interface AnnouncementRow {
  id: string;
  announcement_type: string;
  severity: string;
  status: string;
  lang: string;
  title: string;
  content: string;
  cta_label: string | null;
  cta_url: string | null;
  target_plans: string[];
  target_tenant_types: string[];
  is_dismissible: boolean;
  publish_at: Date;
  expires_at: Date | null;
  meta: Record<string, unknown> | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

@Injectable()
export class PgOpsRepository {
  constructor(@Inject(OPS_PG_POOL) private readonly pool: Pool) {}

  // ── Admin ──────────────────────────────────────────────────────────────

  async findAdminByIdentifier(identifier: string): Promise<AdminRecord | null> {
    const result = await this.pool.query<AdminRow>(
      `select a.*, c.password_hash, c.failed_attempts as login_failure_count,
              c.locked_until, c.password_changed_at,
              coalesce(m.totp_enabled, false) as mfa_enabled
       from admin.operator_account a
       left join admin.operator_credential c on c.operator_id = a.id
       left join admin.operator_mfa m on m.operator_id = a.id
       where a.deleted_at is null and a.status = 'active'
         and (lower(a.username) = lower($1)
           or lower(coalesce(a.email,'')) = lower($1)
           or coalesce(a.phone,'') = $1)
       limit 1`,
      [identifier.trim()],
    );
    const row = result.rows[0];
    return row ? this.mapAdmin(row) : null;
  }

  async findAdminById(id: string): Promise<AdminRecord | null> {
    const result = await this.pool.query<AdminRow>(
      `select a.*, c.password_hash, c.failed_attempts as login_failure_count,
              c.locked_until, c.password_changed_at,
              coalesce(m.totp_enabled, false) as mfa_enabled
       from admin.operator_account a
       left join admin.operator_credential c on c.operator_id = a.id
       left join admin.operator_mfa m on m.operator_id = a.id
       where a.id = $1 and a.deleted_at is null limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapAdmin(row) : null;
  }

  async listAdmins(params: ListAdminsParams): Promise<ListAdminsResult> {
    const conditions: string[] = ["a.deleted_at is null"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.status) {
      conditions.push(`a.status = $${idx++}`);
      values.push(params.status);
    }
    if (params.roleId) {
      conditions.push(`a.role_id = $${idx++}`);
      values.push(params.roleId);
    }
    if (params.keyword) {
      conditions.push(
        `(a.username ilike $${idx} or a.display_name ilike $${idx} or a.email ilike $${idx})`,
      );
      values.push(`%${params.keyword}%`);
      idx++;
    }

    const where = conditions.join(" and ");
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from admin.operator_account a where ${where}`,
        values,
      ),
      this.pool.query<AdminRow>(
        `select a.*, r.role_name as role_name_en,
                c.password_hash, c.failed_attempts as login_failure_count,
                c.locked_until, c.password_changed_at,
                coalesce(m.totp_enabled, false) as mfa_enabled
         from admin.operator_account a
         left join admin.operator_role r on r.id = a.role_id
         left join admin.operator_credential c on c.operator_id = a.id
         left join admin.operator_mfa m on m.operator_id = a.id
         where ${where}
         order by a.sort asc, a.created_at desc
         limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapAdminView),
    };
  }

  async createAdmin(input: CreateAdminInput): Promise<AdminRecord> {
    // Admin-created operators are personal accounts; password lives in
    // operator_credential (split from operator_account).
    const inserted = await this.pool.query<{ id: string }>(
      `insert into admin.operator_account (
        role_id, username, email, phone, display_name, account_type,
        remark, sort, created_by, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,'personal',$6,$7,$8,now(),now())
      returning id`,
      [
        input.roleId,
        input.username,
        input.email ?? null,
        input.phone ?? null,
        input.displayName ?? "",
        input.remark ?? null,
        input.sort ?? 999,
        input.createdBy ?? null,
      ],
    );
    const id = inserted.rows[0]!.id;
    await this.pool.query(
      `insert into admin.operator_credential (operator_id, password_hash, created_at, updated_at)
       values ($1, $2, now(), now())
       on conflict (operator_id) do update set
         password_hash = excluded.password_hash, updated_at = now()`,
      [id, input.passwordHash],
    );
    const record = await this.findAdminById(id);
    if (!record)
      throw new Error("createAdmin: operator not found after insert");
    return record;
  }

  async updateAdmin(
    id: string,
    input: UpdateAdminInput,
  ): Promise<AdminRecord | null> {
    const sets: string[] = ["updated_at = now()"];
    const values: unknown[] = [id];
    let idx = 2;

    if (input.roleId !== undefined) {
      sets.push(`role_id = $${idx++}`);
      values.push(input.roleId);
    }
    if (input.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(input.status);
    }
    if (input.email !== undefined) {
      sets.push(`email = $${idx++}`);
      values.push(input.email);
    }
    if (input.phone !== undefined) {
      sets.push(`phone = $${idx++}`);
      values.push(input.phone);
    }
    if (input.displayName !== undefined) {
      sets.push(`display_name = $${idx++}`);
      values.push(input.displayName);
    }
    if (input.remark !== undefined) {
      sets.push(`remark = $${idx++}`);
      values.push(input.remark);
    }
    if (input.sort !== undefined) {
      sets.push(`sort = $${idx++}`);
      values.push(input.sort);
    }
    if (input.updatedBy !== undefined) {
      sets.push(`updated_by = $${idx++}`);
      values.push(input.updatedBy);
    }

    const result = await this.pool.query<{ id: string }>(
      `update admin.operator_account set ${sets.join(", ")} where id = $1 and deleted_at is null returning id`,
      values,
    );
    const updatedId = result.rows[0]?.id;
    return updatedId ? this.findAdminById(updatedId) : null;
  }

  async updateAdminPassword(id: string, passwordHash: string): Promise<void> {
    // Password lives in operator_credential (1-1); upsert so an account without a
    // credential row (e.g. one created without a password) gets one.
    await this.pool.query(
      `insert into admin.operator_credential (operator_id, password_hash, password_changed_at, created_at, updated_at)
       values ($1, $2, now(), now(), now())
       on conflict (operator_id) do update set
         password_hash = excluded.password_hash,
         password_changed_at = now(),
         updated_at = now()`,
      [id, passwordHash],
    );
  }

  async recordLogin(id: string, ip: string, success: boolean): Promise<void> {
    if (success) {
      await this.pool.query(
        `update admin.operator_account set last_login_at = now(), last_login_ip = $2, updated_at = now()
         where id = $1`,
        [id, ip],
      );
      await this.pool.query(
        `update admin.operator_credential set failed_attempts = 0, locked_until = null, updated_at = now()
         where operator_id = $1`,
        [id],
      );
    } else {
      await this.pool.query(
        `update admin.operator_credential set failed_attempts = failed_attempts + 1, updated_at = now()
         where operator_id = $1`,
        [id],
      );
    }
  }

  async softDeleteAdmin(id: string, deletedBy?: string): Promise<void> {
    await this.pool.query(
      `update admin.operator_account set deleted_at = now(), updated_by = coalesce($2, updated_by), updated_at = now()
       where id = $1 and deleted_at is null`,
      [id, deletedBy ?? null],
    );
  }

  // ── Role ────────────────────────────────────────────────────────────────

  async listRoles(): Promise<RoleRecord[]> {
    const result = await this.pool.query<RoleRow>(
      `select * from admin.operator_role order by sort asc, created_at asc`,
    );
    return result.rows.map(this.mapRole);
  }

  async getRoleById(id: string): Promise<RoleRecord | null> {
    const result = await this.pool.query<RoleRow>(
      `select * from admin.operator_role where id = $1 limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapRole(row) : null;
  }

  async getRoleDetail(id: string): Promise<RoleDetail | null> {
    const [roleResult, permsResult] = await Promise.all([
      this.pool.query<RoleRow>(
        `select * from admin.operator_role where id = $1 limit 1`,
        [id],
      ),
      this.pool.query<PermRow>(
        `select p.* from admin.operator_permission p
         join admin.operator_role_permission rp on rp.permission_id = p.id
         where rp.role_id = $1
         order by p.sort asc`,
        [id],
      ),
    ]);
    const role = roleResult.rows[0];
    if (!role) return null;
    return {
      ...this.mapRole(role),
      permissions: permsResult.rows.map(this.mapPerm),
    };
  }

  async createRole(input: CreateRoleInput): Promise<RoleRecord> {
    const result = await this.pool.query<RoleRow>(
      `insert into admin.operator_role (
        role_code, role_name, role_name_key, description, description_key,
        sort, created_by, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,now(),now()) returning *`,
      [
        input.roleCode,
        input.nameEn,
        input.nameI18nKey,
        input.description ?? "",
        input.descriptionI18nKey ?? null,
        input.sort ?? 999,
        input.createdBy ?? null,
      ],
    );
    return this.mapRole(result.rows[0]!);
  }

  async setRolePermissions(
    roleId: string,
    permissionIds: string[],
    operatorId: string,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `delete from admin.operator_role_permission where role_id = $1`,
        [roleId],
      );
      for (const permId of permissionIds) {
        await client.query(
          `insert into admin.operator_role_permission (role_id, permission_id, created_by, created_at)
           values ($1, $2, $3, now())
           on conflict do nothing`,
          [roleId, permId, operatorId],
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Permission ──────────────────────────────────────────────────────────

  async listPermissions(): Promise<PermissionRecord[]> {
    const result = await this.pool.query<PermRow>(
      `select * from admin.operator_permission where is_active = true order by sort asc`,
    );
    return result.rows.map(this.mapPerm);
  }

  async getPermissionsByRoleId(roleId: string): Promise<PermissionRecord[]> {
    const result = await this.pool.query<PermRow>(
      `select p.* from admin.operator_permission p
       join admin.operator_role_permission rp on rp.permission_id = p.id
       where rp.role_id = $1 and p.is_active = true
       order by p.sort asc`,
      [roleId],
    );
    return result.rows.map(this.mapPerm);
  }

  // ── Setting ─────────────────────────────────────────────────────────────

  async getSettingsByGroup(configGroup?: string): Promise<SettingRecord[]> {
    const where = configGroup ? `where config_group = $1` : "";
    const values = configGroup ? [configGroup] : [];
    const result = await this.pool.query<SettingRow>(
      `select * from admin.settings ${where} order by config_group, config_key`,
      values,
    );
    return result.rows.map(this.mapSetting);
  }

  async getSettingByKey(configKey: string): Promise<SettingRecord | null> {
    const result = await this.pool.query<SettingRow>(
      `select * from admin.settings where config_key = $1 limit 1`,
      [configKey],
    );
    const row = result.rows[0];
    return row ? this.mapSetting(row) : null;
  }

  async upsertSetting(
    key: string,
    value: string,
    updatedBy?: string,
  ): Promise<SettingRecord> {
    const result = await this.pool.query<SettingRow>(
      `update admin.settings set config_value = $2, updated_by = $3, updated_at = now()
       where config_key = $1 and is_readonly = false
       returning *`,
      [key, value, updatedBy ?? null],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Setting '${key}' not found or is readonly`);
    return this.mapSetting(row);
  }

  // ── Governance ──────────────────────────────────────────────────────────

  async listGovernance(
    params: ListGovernanceParams,
  ): Promise<{ items: GovernanceRecord[]; total: number }> {
    const conditions: string[] = ["deleted_at is null"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.kind) {
      conditions.push(`kind = $${idx++}`);
      values.push(params.kind);
    }
    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }
    if (params.tags?.length) {
      conditions.push(`tags && $${idx++}::varchar[]`);
      values.push(params.tags);
    }

    const where = conditions.join(" and ");
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from admin.governance_record where ${where}`,
        values,
      ),
      this.pool.query<GovernanceRow>(
        `select * from admin.governance_record where ${where}
         order by updated_at desc limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapGovernance),
    };
  }

  async upsertGovernance(
    input: UpsertGovernanceInput,
  ): Promise<GovernanceRecord> {
    const result = await this.pool.query<GovernanceRow>(
      `insert into admin.governance_record (
        id, kind, name, status, scope, owner, policy, description, tags,
        source_table, source_id, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now())
      on conflict (kind, id) do update set
        name = excluded.name, status = excluded.status,
        scope = excluded.scope, owner = excluded.owner,
        policy = excluded.policy, description = excluded.description,
        tags = excluded.tags, source_table = excluded.source_table,
        source_id = excluded.source_id, updated_at = now()
      returning *`,
      [
        input.id,
        input.kind,
        input.name,
        input.status ?? "normal",
        input.scope,
        input.owner,
        input.policy,
        input.description ?? "",
        input.tags ?? [],
        input.sourceTable ?? null,
        input.sourceId ?? null,
      ],
    );
    return this.mapGovernance(result.rows[0]!);
  }

  // ── Announcement ────────────────────────────────────────────────────────

  async listAnnouncements(
    params: ListAnnouncementsParams,
  ): Promise<{ items: AnnouncementRecord[]; total: number }> {
    const conditions: string[] = ["deleted_at is null"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }
    if (params.announcementType) {
      conditions.push(`announcement_type = $${idx++}`);
      values.push(params.announcementType);
    }
    if (params.lang) {
      conditions.push(`lang = $${idx++}`);
      values.push(params.lang);
    }

    const where = conditions.join(" and ");
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from admin.announcements where ${where}`,
        values,
      ),
      this.pool.query<AnnouncementRow>(
        `select * from admin.announcements where ${where}
         order by publish_at desc limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapAnnouncement),
    };
  }

  async getAnnouncementById(id: string): Promise<AnnouncementRecord | null> {
    const result = await this.pool.query<AnnouncementRow>(
      `select * from admin.announcements where id = $1 and deleted_at is null limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapAnnouncement(row) : null;
  }

  // ── Mappers ─────────────────────────────────────────────────────────────

  private mapAdmin(row: AdminRow): AdminRecord {
    return {
      id: row.id,
      roleId: row.role_id,
      username: row.username,
      status: row.status,
      email: row.email,
      phone: row.phone,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      loginFailureCount: row.login_failure_count,
      remark: row.remark,
      lastLoginIp: row.last_login_ip,
      isSystem: row.account_type !== "personal",
      mfaEnabled: row.mfa_enabled,
      lockedUntil: row.locked_until,
      passwordChangedAt: row.password_changed_at,
      lastLoginAt: row.last_login_at,
      sort: row.sort,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private mapAdminView(row: AdminRow): AdminView {
    const { passwordHash: _ph, ...rest } = {
      id: row.id,
      roleId: row.role_id,
      username: row.username,
      status: row.status,
      email: row.email,
      phone: row.phone,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      loginFailureCount: row.login_failure_count,
      remark: row.remark,
      lastLoginIp: row.last_login_ip,
      isSystem: row.account_type !== "personal",
      mfaEnabled: row.mfa_enabled,
      lockedUntil: row.locked_until,
      passwordChangedAt: row.password_changed_at,
      lastLoginAt: row.last_login_at,
      sort: row.sort,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      roleName: row.role_name_en,
    };
    void _ph;
    return rest;
  }

  private mapRole(row: RoleRow): RoleRecord {
    return {
      id: row.id,
      roleCode: row.role_code,
      status: row.status,
      nameEn: row.role_name,
      nameI18nKey: row.role_name_key,
      description: row.description,
      descriptionI18nKey: row.description_key,
      isSystem: row.is_system,
      sort: row.sort,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPerm(row: PermRow): PermissionRecord {
    return {
      id: row.id,
      parentId: row.parent_id,
      permCode: row.perm_code,
      permType: row.perm_type,
      permName: row.perm_name,
      routePath: row.route_path,
      component: row.component,
      icon: row.icon,
      description: row.description,
      isActive: row.is_active,
      isVisible: row.is_visible,
      sort: row.sort,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSetting(row: SettingRow): SettingRecord {
    return {
      id: row.id,
      configGroup: row.config_group,
      configKey: row.config_key,
      valueType: row.value_type,
      configValue: row.config_value,
      isSensitive: row.is_sensitive,
      isEncrypted: row.is_encrypted,
      isReadonly: row.is_readonly,
      validationRule: row.validation_rule,
      description: row.description,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapGovernance(row: GovernanceRow): GovernanceRecord {
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      status: row.status,
      scope: row.scope,
      owner: row.owner,
      policy: row.policy,
      description: row.description,
      tags: row.tags,
      sourceTable: row.source_table,
      sourceId: row.source_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private mapAnnouncement(row: AnnouncementRow): AnnouncementRecord {
    return {
      id: row.id,
      announcementType: row.announcement_type,
      severity: row.severity,
      status: row.status,
      lang: row.lang,
      title: row.title,
      content: row.content,
      ctaLabel: row.cta_label,
      ctaUrl: row.cta_url,
      targetPlans: row.target_plans,
      targetTenantTypes: row.target_tenant_types,
      isDismissible: row.is_dismissible,
      publishAt: row.publish_at,
      expiresAt: row.expires_at,
      meta: row.meta,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }
}
