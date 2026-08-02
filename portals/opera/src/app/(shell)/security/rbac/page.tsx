"use client";

/* RBAC — opera-top-level-design.md §8：Platform Admin / Operator /
 * Developer / Viewer 四角色（平台运维权限，与业务侧 IAM 分立）。 */

import {
  ActionMenu,
  Button,
  DataTable,
  Icon,
  ListPageTemplate,
  ViewHeader,
} from "@vxture/design-system";
import { roles } from "@/mocks/atlas";

export default function RbacPage() {
  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="role"
          title="RBAC"
          description="平台运维权限：角色 × 域授权。与业务侧 IAM 分立，只覆盖 Opera 六域。"
          action={
            <Button variant="outline">
              <Icon name="user-plus" size="sm" />
              添加成员
            </Button>
          }
        />
      }
      table={
        <DataTable
          columns={[
            {
              id: "role",
              header: "角色",
              cell: (r) => (
                <span className="text-label-md text-foreground">{r.role}</span>
              ),
            },
            { id: "scope", header: "授权域", cell: (r) => r.scope },
            {
              id: "members",
              header: "成员数",
              align: "right",
              cell: (r) => r.members,
            },
            { id: "perm", header: "权限", cell: (r) => r.permissions },
            {
              id: "actions",
              header: "",
              align: "right",
              cell: (r) => (
                <ActionMenu
                  label={`${r.role} 操作`}
                  items={[
                    { id: "members", label: "管理成员", icon: "users" },
                    { id: "scope", label: "调整授权域", icon: "faders" },
                  ]}
                />
              ),
            },
          ]}
          rows={roles}
          rowKey={(r) => r.id}
        />
      }
    />
  );
}
