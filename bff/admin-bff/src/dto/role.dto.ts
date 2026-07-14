export class CreateRoleDto {
  roleCode!: string;
  nameI18nKey!: string;
  nameEn!: string;
  descriptionI18nKey?: string | null;
  description?: string | null;
  permissionIds?: string[];
}

export class UpdateRoleDto {
  nameI18nKey?: string | null;
  nameEn?: string | null;
  descriptionI18nKey?: string | null;
  description?: string | null;
  status?: "active" | "disabled";
  permissionIds?: string[];
}
