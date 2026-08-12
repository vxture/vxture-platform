"use client";

import { PlannedManagementPage } from "@/components/planned/PlannedManagementPage";

export default function RunosQualityProfilesPage() {
  return (
    <PlannedManagementPage
      icon="target"
      title="Quality Profile"
      description="能力的质量档案：持续观测评分 + golden-dataset 回归门禁。"
      route="/capability/quality-profiles"
      carries="评分对象是能力资产本身而非 agent；分数写回 Registry 并影响语义发现的排序（M3 范围，随 M2 之后到）。"
    />
  );
}
