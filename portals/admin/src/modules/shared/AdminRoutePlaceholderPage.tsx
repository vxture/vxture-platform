import { notFound } from "next/navigation";
import { flattenAdminNavigationItems } from "@/config/navigation";
import { AdminPlaceholderPage } from "./AdminPlaceholderPage";

export function AdminRoutePlaceholderPage({ href }: { href: string }) {
  const match = flattenAdminNavigationItems().find(
    ({ item }) => item.href === href,
  );

  if (!match) {
    notFound();
  }

  return (
    <AdminPlaceholderPage
      item={match.item}
      sectionTitle={match.section.title}
    />
  );
}
