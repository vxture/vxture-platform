/**
 * server.ts - Server-safe design-system export entry
 * @package @vxture/design-system
 */

export * from "./tokens";
export type * from "./types";

// ---------------------------------------------------------------------------
// Server-safe presentational components (RSC-usable, no "use client" boundary).
//
// Only pure leaves whose ENTIRE import graph is react + utils/cn (or other pure
// leaves listed here) are allowed. These render identically on the server with
// no client APIs, so a React Server Component may import them from
// "@vxture/design-system/server" without turning into a client component.
//
// ⚠️ HARD RULE — do NOT add:
//   - anything using a hook (useState/useEffect/useRef/useContext/…) or Radix
//     (Button, ActionButton, Select, Tabs, Dialog, DropdownMenu, DataTable, …),
//   - anything importing ../../icons (Icon → iconRegistry → @phosphor-icons/react
//     CSR build calls createContext at module load → breaks in RSC; so
//     PageHeader / DetailSectionHeading are deliberately EXCLUDED here),
//   - anything carrying React context (theme/density providers).
// Adding any of the above pulls "use client"/hooks/createContext into the
// server graph and can crash server render. The bare "@vxture/design-system"
// entry (client.ts) stays the home for all interactive components.
// ---------------------------------------------------------------------------
export * from "./components/ui/Badge";
export * from "./components/ui/StatusBadge";
export * from "./components/ui/Card";
export * from "./components/ui/SectionCard";
export * from "./components/ui/MetricCard";
export * from "./components/ui/EmptyState";
export * from "./components/ui/Banner";
export * from "./components/ui/PageSection";
export * from "./components/ui/PageStack";
export * from "./components/ui/PageActions";
export * from "./components/ui/EntityListPage";
export * from "./components/layout/container";
export * from "./components/layout/stack";
export * from "./components/layout/grid";
