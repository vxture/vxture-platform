import { OrderDetailPage } from "@/modules/orders/OrderDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{
    orderId: string;
  }>;
}) {
  const { orderId } = await params;
  return <OrderDetailPage orderId={decodeURIComponent(orderId)} />;
}
