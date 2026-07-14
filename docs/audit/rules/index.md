# Vxture AI Rules Index

This document defines the list of AI audit rules used to validate the Vxture repository.

The rules enforce:

- monorepo structure
- architecture boundaries
- dependency rules
- TypeScript configuration
- code quality standards

All rules are located in:

docs/ai/audit/rules/

# Rule Execution Order

Rules must be executed in the following order.

This order ensures that foundational structural issues are detected before code-level issues.

| Order | Rule                     | File                   |
| ----- | ------------------------ | ---------------------- |
| 01    | Monorepo Structure Check | 01-monorepo.md         |
| 02    | Folder Structure Check   | 02-folder-structure.md |
| 03    | Architecture Layer Check | 03-architecture.md     |
| 04    | Dependency Rules Check   | 04-dependency.md       |
| 05    | Import Rules Check       | 05-import-rules.md     |
| 06    | Shared Layer Check       | 06-shared-layer.md     |
| 07    | Core Layer Check         | 07-core-layer.md       |
| 08    | TypeScript Config Check  | 08-tsconfig.md         |
| 09    | Code Style Check         | 09-code-style.md       |
| 10    | Comments Standard Check  | 10-comments.md         |

# Rule Descriptions

## 01 Monorepo Structure Check

Validates that the repository follows the defined monorepo structure.

Includes:

- correct top-level directories
- package layout
- workspace configuration

## 02 Folder Structure Check

Ensures that each package follows the required folder structure.

Examples:

src/
index.ts
tsconfig.json
package.json

## 03 Architecture Layer Check

Validates the architecture layering rules.

Layers include:

shared
core
service
portal
design system

## 04 Dependency Rules Check

Ensures that packages only depend on allowed layers.

Validates against:

docs/architecture/02-package-boundaries.md

## 05 Import Rules Check

Validates import paths between packages.

Examples:

Allowed

@vxture/core-api

Forbidden

relative cross-package imports

## 06 Shared Layer Check

Ensures the shared layer remains independent.

Shared packages must not depend on:

core
service
portal

## 07 Core Layer Check

Ensures core packages:

- remain framework agnostic
- contain no UI logic
- contain no business logic

## 08 TypeScript Config Check

Validates tsconfig configuration.

Checks:

- composite configuration
- path aliases
- build configuration

## 09 Code Style Check

Validates code style standards.

Includes:

- naming conventions
- formatting
- consistent patterns

## 10 Comments Standard Check

Validates file header comments and documentation.

Each file must include:

- package name
- layer
- category
- description

# How the Rules Are Used

The audit runner loads rules in this order:

1. run.md
2. load this index
3. execute rules sequentially
4. generate audit report

# Related Documents

AI Audit System

docs/ai/audit/run.md
docs/ai/audit/scope.md
docs/ai/audit/severity.md
docs/ai/audit/report-template.md

Architecture Documentation

docs/architecture/

# Goal

Ensure the Vxture repository remains:

- architecturally consistent
- maintainable
- compliant with development standards
