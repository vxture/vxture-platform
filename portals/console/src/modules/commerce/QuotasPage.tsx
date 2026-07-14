import { ActionButton, PageHeader } from "@vxture/design-system";
import { DashboardSplit, PageSection, SignalList } from "@/layout/shell";

// ============================================================================
// QuotasPage
// ============================================================================

const quotaSignals = [
  {
    title: "Fine-tune budget watch",
    description:
      "GPU hours are the first pool approaching review threshold and should stay visible above the table.",
  },
  {
    title: "Seat headroom",
    description:
      "Current seat usage leaves space for near-term onboarding without changing the subscription tier.",
  },
];

export function QuotasPage() {
  return (
    <div className="vx-page-stack">
      <PageHeader
        eyebrow="Commerce"
        title="Quotas"
        description="Quota monitoring should feel operational and readable, not like a dense reporting dashboard."
        action={<ActionButton icon="warning">Adjust alert policy</ActionButton>}
      />

      <DashboardSplit>
        <PageSection
          title="Quota posture"
          description="Lead with the pools that need human attention before expanding into raw usage rows."
          tone="muted"
        >
          <SignalList items={quotaSignals} />
        </PageSection>

        <PageSection
          title="Alert actions"
          description="Quota management should feel like operations, not just reporting."
        >
          <div className="vx-detail-actions">
            <ActionButton variant="outline" icon="warning">
              Review GPU alerting
            </ActionButton>
            <ActionButton variant="outline" icon="arrow-down">
              Export usage snapshot
            </ActionButton>
            <ActionButton variant="outline" icon="settings">
              Adjust thresholds
            </ActionButton>
          </div>
        </PageSection>
      </DashboardSplit>

      <PageSection
        title="Quota pools"
        description="Real-time quota usage data will be available after your first billing cycle."
      >
        <p className="vx-empty-hint">
          Quota pool data is not yet available. Usage metering is activated once
          your subscription is provisioned and your first workload runs.
        </p>
      </PageSection>
    </div>
  );
}
