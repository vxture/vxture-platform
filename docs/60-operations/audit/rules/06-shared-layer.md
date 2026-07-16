Shared Layer Validation

Location

packages/shared

Rules

Shared layer contains only:

TypeScript types
constants
pure utilities
generic helpers

Forbidden

UI components
React hooks
business logic
service logic
portal logic

Allowed dependencies

None except standard TypeScript utilities.

Shared must be fully framework-agnostic.

All exports must be available via:

packages/shared/src/index.ts
