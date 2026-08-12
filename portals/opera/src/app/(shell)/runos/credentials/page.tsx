"use client";

import { PlannedManagementPage } from "@/components/planned/PlannedManagementPage";

export default function RunosCredentialsPage() {
  return (
    <PlannedManagementPage
      icon="key"
      title="Credential"
      description="第三方系统凭证托管与代理注入（连接器调用外部系统时用）。"
      route="/capability/credentials"
      carries="凭证托管归属沿用 atlas M-3 同一原则——控制台零持有明文，创建 / 轮换写入时明文只过一次网，此后只见掩码元数据与轮换日志；变更路由要求 step-up。"
    />
  );
}
