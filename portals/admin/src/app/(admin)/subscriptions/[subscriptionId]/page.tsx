import { SubscriptionDetailPage } from "@/modules/subscriptions/SubscriptionDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{
    subscriptionId: string;
  }>;
}) {
  const { subscriptionId } = await params;
  return (
    <SubscriptionDetailPage
      subscriptionId={decodeURIComponent(subscriptionId)}
    />
  );
}
