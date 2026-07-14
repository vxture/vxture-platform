import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { PgOpsRepository } from "../repository/pg-ops.repository";
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

@Injectable()
export class OpsService {
  constructor(private readonly repo: PgOpsRepository) {}

  // ── Admin Auth ──────────────────────────────────────────────────────────

  async findAdminForAuth(identifier: string): Promise<AdminRecord | null> {
    return this.repo.findAdminByIdentifier(identifier);
  }

  async recordLoginSuccess(id: string, ip: string): Promise<void> {
    return this.repo.recordLogin(id, ip, true);
  }

  async recordLoginFailure(id: string): Promise<void> {
    return this.repo.recordLogin(id, "", false);
  }

  // ── Admin CRUD ──────────────────────────────────────────────────────────

  async listAdmins(params: ListAdminsParams): Promise<ListAdminsResult> {
    return this.repo.listAdmins(params);
  }

  async getAdmin(id: string): Promise<AdminView> {
    const record = await this.repo.findAdminById(id);
    if (!record) throw new NotFoundException(`运营账号 ${id} 不存在`);
    const { passwordHash: _ph, ...view } = record;
    void _ph;
    return view;
  }

  async createAdmin(input: CreateAdminInput): Promise<AdminView> {
    const record = await this.repo.createAdmin(input);
    const { passwordHash: _ph, ...view } = record;
    void _ph;
    return view;
  }

  async updateAdmin(id: string, input: UpdateAdminInput): Promise<AdminView> {
    const existing = await this.repo.findAdminById(id);
    if (!existing) throw new NotFoundException(`运营账号 ${id} 不存在`);
    if (existing.isSystem) throw new ConflictException("系统内置账号不可修改");

    const result = await this.repo.updateAdmin(id, input);
    const { passwordHash: _ph, ...view } = result!;
    void _ph;
    return view;
  }

  async updateAdminPassword(
    id: string,
    newPasswordHash: string,
  ): Promise<void> {
    const existing = await this.repo.findAdminById(id);
    if (!existing) throw new NotFoundException(`运营账号 ${id} 不存在`);
    return this.repo.updateAdminPassword(id, newPasswordHash);
  }

  async deleteAdmin(id: string, operatorId?: string): Promise<void> {
    const existing = await this.repo.findAdminById(id);
    if (!existing) throw new NotFoundException(`运营账号 ${id} 不存在`);
    if (existing.isSystem) throw new ConflictException("系统内置账号不可删除");
    return this.repo.softDeleteAdmin(id, operatorId);
  }

  // ── Role & Permission ────────────────────────────────────────────────────

  async listRoles(): Promise<RoleRecord[]> {
    return this.repo.listRoles();
  }

  async getRoleDetail(id: string): Promise<RoleDetail> {
    const result = await this.repo.getRoleDetail(id);
    if (!result) throw new NotFoundException(`角色 ${id} 不存在`);
    return result;
  }

  async createRole(input: CreateRoleInput): Promise<RoleRecord> {
    return this.repo.createRole(input);
  }

  async setRolePermissions(
    roleId: string,
    permissionIds: string[],
    operatorId: string,
  ): Promise<void> {
    const role = await this.repo.getRoleById(roleId);
    if (!role) throw new NotFoundException(`角色 ${roleId} 不存在`);
    if (role.isSystem)
      throw new ConflictException("系统内置角色权限不可手动修改");
    return this.repo.setRolePermissions(roleId, permissionIds, operatorId);
  }

  async listPermissions(): Promise<PermissionRecord[]> {
    return this.repo.listPermissions();
  }

  async getPermissionsByRoleId(roleId: string): Promise<PermissionRecord[]> {
    return this.repo.getPermissionsByRoleId(roleId);
  }

  // ── Settings ─────────────────────────────────────────────────────────────

  async getSettings(configGroup?: string): Promise<SettingRecord[]> {
    return this.repo.getSettingsByGroup(configGroup);
  }

  async getSetting(key: string): Promise<SettingRecord> {
    const record = await this.repo.getSettingByKey(key);
    if (!record) throw new NotFoundException(`配置项 '${key}' 不存在`);
    return record;
  }

  async updateSetting(
    key: string,
    value: string,
    updatedBy?: string,
  ): Promise<SettingRecord> {
    return this.repo.upsertSetting(key, value, updatedBy);
  }

  // ── Governance ───────────────────────────────────────────────────────────

  async listGovernance(
    params: ListGovernanceParams,
  ): Promise<{ items: GovernanceRecord[]; total: number }> {
    return this.repo.listGovernance(params);
  }

  async upsertGovernance(
    input: UpsertGovernanceInput,
  ): Promise<GovernanceRecord> {
    return this.repo.upsertGovernance(input);
  }

  // ── Announcements ────────────────────────────────────────────────────────

  async listAnnouncements(
    params: ListAnnouncementsParams,
  ): Promise<{ items: AnnouncementRecord[]; total: number }> {
    return this.repo.listAnnouncements(params);
  }

  async getAnnouncement(id: string): Promise<AnnouncementRecord> {
    const record = await this.repo.getAnnouncementById(id);
    if (!record) throw new NotFoundException(`公告 ${id} 不存在`);
    return record;
  }
}
