import { ProductSolutionDetailPage } from "@/modules/products/ProductSolutionDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{
    solutionCode: string;
  }>;
}) {
  const { solutionCode } = await params;
  return (
    <ProductSolutionDetailPage
      solutionCode={decodeURIComponent(solutionCode)}
    />
  );
}
