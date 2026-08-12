"use client";

import { PlannedManagementPage } from "@/components/planned/PlannedManagementPage";

export default function RunosPoliciesPage() {
  return (
    <PlannedManagementPage
      icon="shield"
      title="Policy"
      description="风险策略引擎：read / write / critical 三级操作策略。"
      route="/capability/policies"
      carries="按能力 / 按风险级配置策略；critical 级操作在调用时强制人工确认，凭证变更类路由额外要求 step-up（amr 超过 pwd）。"
    />
  );
}
