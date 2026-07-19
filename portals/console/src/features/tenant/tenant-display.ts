/**
 * tenant-display.ts — canonical outward tenant label (owner rule 2026-07-06).
 *
 * A tenant renders as `{tenant.name} {tenant.type}` — e.g. "yanhaoguo personal"
 * vs "yanhaoguo organization" — so identical names across the two tenant types
 * stay distinguishable (the personal auto-tenant is named after the user, and a
 * team the user founds may carry the same name).
 */
export function formatTenantDisplay(
  name?: string | null,
  type?: string | null,
): string {
  const n = (name ?? "").trim();
  if (!n) return "";
  const t = (type ?? "").trim();
  if (!t) return n;
  // Capitalize the type suffix — e.g. "StoneSmoker Personal" / "Acme Organization".
  return `${n} ${t.charAt(0).toUpperCase()}${t.slice(1)}`;
}
