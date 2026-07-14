# Vxture AI Audit Prompt

## Context

You are performing a full static compliance audit for the Vxture monorepo.

Follow the architecture and coding standards defined in the documentation.

Architecture Docs

docs/architecture/01-monorepo.md
docs/architecture/02-package-boundaries.md
docs/architecture/03-package-graph.json
docs/architecture/04-shared-layer.md
docs/architecture/03-core-layer.md
docs/architecture/04-service-layer.md
docs/architecture/05-bff-layer.md
docs/architecture/06-agent-server.md
docs/architecture/12-typescript.md

AI Standards

docs/ai/03-coding-comments.md
docs/ai/01-coding-rules.md
docs/ai/02-coding-style.md

Audit Scope

docs/ai/audit/scope.md

## Objective

Execute a full repository audit using all rule prompts located in:

docs/ai/audit/rules/

Rules include:

- architecture check
- code style check
- comments check
- core layer check
- dependency check
- folder structure check
- import rules check
- monorepo check
- shared layer check
- tsconfig check

## Strict Constraints

### Inspection Only

You must ONLY perform analysis.

You must NOT:

- modify code
- refactor code
- generate replacement code
- change folder structures
- create packages

### Only Audit Completed Packages

Completed packages are defined in:

docs/ai/audit/scope.md

Do NOT audit packages not listed there.

### Respect Architecture Boundaries

Layer rules are defined in:

docs/architecture/02-package-boundaries.md
docs/architecture/03-package-graph.json

## Output Requirements

Generate a Markdown audit report.

File name must follow this format:

ai-rules-audit-YYYY-MM-DD.md

Use the report template defined in:

docs/ai/audit/report-template.md

## Execution Steps

1. Load audit scope configuration
2. Identify completed packages
3. Load all AI rule prompts
4. Execute each rule independently
5. Collect violations
6. Classify severity
7. Generate the audit report

## Important Rules

You must NEVER modify repository files.

This task is strictly a read-only compliance audit.

## Goal

Ensure the repository complies with:

- Vxture Architecture
- Claude Coding Standards
- TypeScript Monorepo Standards
- Package Dependency Rules
