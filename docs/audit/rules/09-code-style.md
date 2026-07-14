Vxture AI Coding Rules

Objective

Ensure all AI-generated code follows Vxture architecture, standards,
and monorepo boundaries.

Rules

1. Respect Architecture Layers

Valid layers:

Shared
Core
Service
Platform
Portal

Dependency rules:

Shared → no dependencies
Core → may depend on Shared
Service → may depend on Core and Shared
Platform → may depend on Service, Core, Shared
Portal → may depend on Platform, Service, Core, Shared

Forbidden:

lower layer importing higher layer

Examples

Shared cannot import Core
Core cannot import Service
Service cannot import Portal

2. Follow Monorepo Package Boundaries

Allowed imports must use package aliases:

@vxture/shared
@vxture/core-_
@vxture/platform-_
@vxture/design-system

Do not use deep relative imports.

Invalid:

../../../../core-api

3. Follow TypeScript Standards

All code must follow:

docs/standards/vx-TsconfigConfig.md

Strict mode must never be disabled.

4. Follow Comment Standards

All source files must include header comments:

filename.ts - short description

Required tags:

@package
@layer
@category
@author
@date
@version

Follow:

docs/ai/claude-03-coding-comments.md

5. Do Not Introduce Framework Dependencies in Core

Core layer must remain framework-agnostic.

Forbidden in Core:

React
Next.js
Vue
DOM APIs

6. Export Public APIs via index.ts

Every package must expose its public API via index.ts.

Internal files must not be imported directly.

7. Prefer Composition over Duplication

If a utility already exists in Shared or Core,
reuse it instead of creating duplicates.
