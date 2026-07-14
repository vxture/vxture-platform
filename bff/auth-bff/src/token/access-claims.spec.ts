import { describe, it, expect } from "vitest";
import { buildAccessClaims } from "./access-claims";

describe("buildAccessClaims", () => {
  it("emits the authz context + org type/names when provided", () => {
    const c = buildAccessClaims({
      sessionId: "sid_1",
      activeOrg: "org_1",
      activeOrgType: "organization",
      activeOrgName: "Acme Inc",
      activeWorkspace: "ws_1",
      activeWorkspaceName: "Default",
      roles: ["org:owner", "workspace:owner"],
      userType: "tenant_user",
    });
    expect(c).toMatchObject({
      sid: "sid_1",
      active_org: "org_1",
      active_org_type: "organization",
      active_org_name: "Acme Inc",
      active_workspace: "ws_1",
      active_workspace_name: "Default",
      roles: ["org:owner", "workspace:owner"],
      userType: "tenant_user",
    });
  });

  it("omits org type/name + workspace name when absent (RP applies its own fallbacks)", () => {
    const c = buildAccessClaims({ activeOrg: "org_1", roles: [] });
    expect("active_org_type" in c).toBe(false);
    expect("active_org_name" in c).toBe(false);
    expect("active_workspace_name" in c).toBe(false);
    expect(c.active_org).toBe("org_1");
  });

  it("merges extra claims last", () => {
    const c = buildAccessClaims({
      activeOrg: "org_1",
      activeOrgType: "personal",
      extra: { scope: "openid profile" },
    });
    expect(c.active_org_type).toBe("personal");
    expect(c.scope).toBe("openid profile");
  });
});
