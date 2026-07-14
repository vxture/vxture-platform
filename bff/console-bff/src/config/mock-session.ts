import type {
  Capability,
  ConsoleUser,
  TenantContext,
} from "../types/console.types";

export const mockUser: ConsoleUser = {
  id: "u_console_admin",
  name: "console.admin",
  email: "lin.chen@vxture.ai",
  roleLabel: "Platform Operator",
  username: "console.admin",
  phone: "13800000000",
};

export const mockTenantContext: TenantContext = {
  id: "tenant_demo",
  name: "Vxture Demo Tenant",
  mode: "platform",
  workspace: "DEMO",
};

export const mockCapabilities: Capability[] = [
  "platform.tenant.manage",
  "platform.product.manage",
  "platform.pricing.manage",
  "platform.model.manage",
  "tenant.user.manage",
  "tenant.role.manage",
  "tenant.subscription.read",
  "tenant.billing.read",
  "tenant.quota.read",
];
