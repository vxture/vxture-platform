# Vxture AI Audit Prompt

## Context

You are performing a full static compliance audit for the Vxture monorepo.

Follow the architecture and coding standards defined in the documentation.

Architecture Docs

docs/30-design/architecture/01-monorepo.md
docs/30-design/architecture/02-package-boundaries.md
docs/30-design/architecture/03-package-graph.json
docs/30-design/architecture/04-shared-layer.md
docs/30-design/architecture/03-core-layer.md
docs/30-design/architecture/04-service-layer.md
docs/30-design/architecture/05-bff-layer.md
docs/30-design/architecture/06-agent-server.md
docs/30-design/architecture/12-typescript.md

AI Standards

docs/40-implementation/ai/03-coding-comments.md
docs/40-implementation/ai/01-coding-rules.md
docs/40-implementation/ai/02-coding-style.md

Audit Scope

docs/40-implementation/ai/audit/scope.md

## Objective

Execute a full repository audit using all rule prompts located in:

docs/40-implementation/ai/audit/rules/

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

docs/40-implementation/ai/audit/scope.md

Do NOT audit packages not listed there.

### Respect Architecture Boundaries

Layer rules are defined in:

docs/30-design/architecture/02-package-boundaries.md
docs/30-design/architecture/03-package-graph.json

## Output Requirements

Generate a Markdown audit report.

File name must follow this format:

ai-rules-audit-YYYY-MM-DD.md

Use the report template defined in:

docs/40-implementation/ai/audit/report-template.md

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
