"use client";

import { PlannedManagementPage } from "@/components/planned/PlannedManagementPage";

export default function RunosSupplyCatalogsPage() {
  return (
    <PlannedManagementPage
      icon="list-checks"
      title="Supply Catalog"
      description="两段裁决第一段——opera 的技术供给目录：按产品发布技术上限（并发上限、成本上限、允许的风险范围）。admin 的能力包只能从这份目录里选，选不到目录外的能力。"
      route="/capability/supply-catalogs[/:id/publish|impact-report]"
      carries="opera 侧发布 / 变更影响分析动作；这是 opera 在 runos 管理面里唯一的写入面，其余六个路由族多为只读治理视图。"
    />
  );
}
