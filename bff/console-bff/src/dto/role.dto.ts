export class CreateRoleDto {
  roleCode!: string;
  roleName!: string;
  description?: string | null;
  permissionIds?: string[];
}

export class UpdateRoleDto {
  roleName?: string | null;
  description?: string | null;
  status?: "active" | "disabled";
  permissionIds?: string[];
}
