/**
 * server.ts - @vxture/design-ui 的 server-safe 子集
 * @package @vxture/design-ui
 */

// ---------------------------------------------------------------------------
// Server-safe presentational components (RSC-usable, no "use client" boundary).
//
// Only pure leaves whose ENTIRE import graph is react + utils/cn (or other pure
// leaves listed here) are allowed. These render identically on the server with
// no client APIs, so a React Server Component may import them from
// "@vxture/design-ui/server" without turning into a client component.
//
// ⚠️ HARD RULE — do NOT add:
//   - anything using a hook (useState/useEffect/useRef/useContext/…) or Radix
//     (Button, ActionButton, Select, Tabs, Dialog, DropdownMenu, DataTable, …),
//   - anything importing ../../icons (Icon → iconRegistry → @phosphor-icons/react
//     CSR build calls createContext at module load → breaks in RSC; so
//     PageHeader / DetailSectionHeading are deliberately EXCLUDED here),
//   - anything carrying React context (theme/density providers).
// Adding any of the above pulls "use client"/hooks/createContext into the
// server graph and can crash server render. The bare "@vxture/design-ui"
// entry (client.ts) stays the home for all interactive components.
// ---------------------------------------------------------------------------
export * from "./components/ui/Badge";
export * from "./components/patterns/StatusBadge";
export * from "./components/ui/Card";
export * from "./components/_pending/remove/SectionCard";
export * from "./components/_pending/patterns/MetricCard";
export * from "./components/patterns/EmptyState";
export * from "./components/_pending/patterns/Banner";
export * from "./components/_pending/patterns/PageSection";
export * from "./components/_pending/patterns/PageStack";
export * from "./components/_pending/remove/PageActions";
export * from "./components/_pending/remove/EntityListPage";
export * from "./components/layout/container";
export * from "./components/layout/stack";
export * from "./components/layout/grid";
