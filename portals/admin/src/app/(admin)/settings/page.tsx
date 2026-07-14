import { OperatorAccountSettings } from "@/modules/settings/OperatorAccountSettings";

/* 「系统设置」页 —— 隶属平台自治域 · 系统配置菜单（见 config/navigation.ts）。
 * Header 齿轮为其快捷入口。当前提供运营人员自助账户设置（邮箱更改 + 验证，TD-017 §③）；
 * 其余系统配置内容待按确认补齐。 */
export default function SettingsPage() {
  return (
    <div className="vx-settings-page">
      <OperatorAccountSettings />
    </div>
  );
}
