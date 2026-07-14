import { TenantDetailPage } from "@/modules/tenants/TenantDetailPage";

type TenantDetailRouteProps = {
  params: Promise<{
    tenantId: string;
  }>;
};

export default async function Page({ params }: TenantDetailRouteProps) {
  const { tenantId } = await params;
  return <TenantDetailPage tenantId={decodeURIComponent(tenantId)} />;
}
