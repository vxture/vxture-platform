export class UpsertMemberDto {
  email!: string;
  nickname?: string | null;
  remark?: string | null;
  roleId?: string | null;
  roleCode?: string | null;
}

export class UpdateMemberDto {
  nickname?: string | null;
  remark?: string | null;
  roleId?: string | null;
  status?: "active" | "inactive" | "banned";
}

export class ResetMemberPasswordDto {
  nextPassword!: string;
}
