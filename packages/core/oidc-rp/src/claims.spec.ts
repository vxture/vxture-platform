import { describe, it, expect } from "vitest";
import { mapAccessClaims } from "./claims";

describe("mapAccessClaims", () => {
  it("maps the authz context (sub/org/workspace/roles/userType + org type/names)", () => {
    const u = mapAccessClaims({
      sub: "usr_abc",
      active_org: "org_1",
      active_org_type: "organization",
      active_org_name: "Acme Inc",
      active_workspace: "ws_1",
      active_workspace_name: "Default",
      roles: ["org:owner", "workspace:member"],
      userType: "tenant_user",
    });
    expect(u).toMatchObject({
      sub: "usr_abc",
      userId: "abc",
      activeOrg: "org_1",
      activeOrgType: "organization",
      activeOrgName: "Acme Inc",
      activeWorkspace: "ws_1",
      activeWorkspaceName: "Default",
      roles: ["org:owner", "workspace:member"],
      userType: "tenant_user",
    });
  });

  it("nulls org type/name + workspace name when the IdP did not release them", () => {
    const u = mapAccessClaims({
      sub: "usr_abc",
      active_org: "org_1",
      roles: [],
    });
    expect(u.activeOrgType).toBeNull();
    expect(u.activeOrgName).toBeNull();
    expect(u.activeWorkspaceName).toBeNull();
  });

  it("maps the human-identity claims released into the access token (§8)", () => {
    const u = mapAccessClaims({
      sub: "usr_abc",
      name: "Alice",
      preferred_username: "alice",
      email: "alice@example.com",
      email_verified: false,
      phone: "+8613800000000",
      phone_verified: true,
      account_status: "active",
      picture: "https://accounts.vxture.com/avatar/usr_abc?v=h1",
    });
    expect(u).toMatchObject({
      name: "Alice",
      preferredUsername: "alice",
      email: "alice@example.com",
      emailVerified: false,
      phone: "+8613800000000",
      phoneVerified: true,
      accountStatus: "active",
      picture: "https://accounts.vxture.com/avatar/usr_abc?v=h1",
    });
  });

  it("nulls identity fields when the IdP did not release them", () => {
    const u = mapAccessClaims({ sub: "usr_abc", roles: [] });
    expect(u.name).toBeNull();
    expect(u.preferredUsername).toBeNull();
    expect(u.email).toBeNull();
    expect(u.emailVerified).toBeNull();
    expect(u.phone).toBeNull();
    expect(u.phoneVerified).toBeNull();
    expect(u.accountStatus).toBeNull();
    expect(u.picture).toBeNull();
  });
});
