import { PageHeader } from "@vxture/design-system";
import { PageSection, SignalList } from "@/layout/shell";

export function TenantPlaceholderPage({
  eyebrow,
  title,
  description,
  signals,
}: {
  eyebrow: string;
  title: string;
  description: string;
  signals: Array<{ title: string; description: string }>;
}) {
  return (
    <div className="vx-page-stack">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <PageSection
        title="规划内容"
        description="当前先完成租户管理门户的信息架构，页面细节后续逐个打磨。"
      >
        <SignalList items={signals} />
      </PageSection>
    </div>
  );
}
