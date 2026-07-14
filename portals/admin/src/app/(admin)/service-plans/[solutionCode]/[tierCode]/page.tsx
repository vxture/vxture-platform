import { ServicePlanDetailPage } from "@/modules/products/ServicePlanDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{
    solutionCode: string;
    tierCode: string;
  }>;
}) {
  const { solutionCode, tierCode } = await params;
  return (
    <ServicePlanDetailPage
      solutionCode={decodeURIComponent(solutionCode)}
      tierCode={decodeURIComponent(tierCode)}
    />
  );
}
