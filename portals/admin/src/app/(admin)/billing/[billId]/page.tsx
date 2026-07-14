import { BillingDetailPage } from "@/modules/billing/BillingDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{
    billId: string;
  }>;
}) {
  const { billId } = await params;
  return <BillingDetailPage billId={decodeURIComponent(billId)} />;
}
