export class UpdateProfileDto {
  displayName?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  timezone?: string | null;
  language?: string | null;
}

export class ChangePasswordDto {
  currentPassword = "";
  nextPassword = "";
}
