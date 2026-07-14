import { ProductCapabilityDetailPage } from "@/modules/products/ProductCapabilityDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{
    productCode: string;
  }>;
}) {
  const { productCode } = await params;
  return (
    <ProductCapabilityDetailPage
      productCode={decodeURIComponent(productCode)}
    />
  );
}
