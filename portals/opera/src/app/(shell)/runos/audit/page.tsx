"use client";

import { PlannedManagementPage } from "@/components/planned/PlannedManagementPage";

export default function RunosAuditPage() {
  return (
    <PlannedManagementPage
      icon="clipboard"
      title="Audit"
      description="运行面 / 管理面双审计事件流；error_class 是唯一归因轴，每个类别对应唯一责任方。"
      route="/capability/audit"
      carries="调用链路全量留痕（认证、凭证注入、配额裁决、策略命中）；management 面操作（供给目录发布、策略变更）也走这条流，operator sub 随 M-1 传入并落库。"
    />
  );
}
