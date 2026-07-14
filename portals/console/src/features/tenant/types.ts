import type { ReactNode } from "react";

export type TenantType = "personal" | "organization";
export type TenantRole = "owner" | "admin" | "member";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
  type: TenantType;
  ownerId: string;
  createdAt: string;
}

export interface TenantMembership {
  userId: string;
  tenantId: string;
  role: TenantRole;
  status: "active" | "pending" | "disabled";
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
  type: TenantType;
  role: TenantRole;
  isCurrent: boolean;
  source?: "session";
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  type: TenantType;
}

export interface TenantContextState {
  currentTenantId: string | null;
  currentTenant: TenantListItem | null;
  tenantList: TenantListItem[];
  hasPersonalTenant: boolean;
  switchTenantContext: (tenantId: string) => Promise<void>;
  createTenant: (payload: CreateTenantPayload) => Promise<void>;
}

export interface TenantProviderProps {
  children: ReactNode;
}
