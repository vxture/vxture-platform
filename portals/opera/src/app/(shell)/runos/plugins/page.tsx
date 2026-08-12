"use client";

import { PlannedManagementPage } from "@/components/planned/PlannedManagementPage";

export default function RunosPluginsPage() {
  return (
    <PlannedManagementPage
      icon="package"
      title="Plugin"
      description="套件——供给侧的注册原子：一个 Skill 及其依赖的 Connector / Asset，同版本同生命周期打包提交（Agent Plugins 1.0.0 格式）。"
      route="/capability/plugins"
      carries="套件的摄入、依赖声明（required / optional）、准入扫描；套件不是授权单元，只是注册与版本化的原子——授权粒度仍在能力级。"
    />
  );
}
