import { AdminRoutePlaceholderPage } from "@/modules/shared/AdminRoutePlaceholderPage";

type AdminPlaceholderRouteProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function AdminPlaceholderRoute({
  params,
}: AdminPlaceholderRouteProps) {
  const { slug = [] } = await params;
  return <AdminRoutePlaceholderPage href={`/${slug.join("/")}`} />;
}
