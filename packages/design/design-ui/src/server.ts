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
//     ViewHeader / SectionHeader are deliberately EXCLUDED here),
//   - anything carrying React context (theme/density providers).
// Adding any of the above pulls "use client"/hooks/createContext into the
// server graph and can crash server render. The bare "@vxture/design-ui"
// entry (client.ts) stays the home for all interactive components.
// ---------------------------------------------------------------------------
export * from "./components/base/Badge";
export * from "./components/base/StatusBadge";
export * from "./components/base/Card";
export * from "./components/composite/MetricCard";
export * from "./components/composite/MetricGrid";
export * from "./components/base/EmptyState";
export * from "./components/base/Banner";
export * from "./components/composite/Section";
export * from "./components/layout/ViewLayout";
export * from "./components/layout/container";
export * from "./components/layout/stack";
export * from "./components/layout/grid";
