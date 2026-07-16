# Vxture AI Issue Severity Standard

This document defines the severity classification for issues detected during AI audits.

All AI rule checks must classify issues according to this standard.

The goal is to ensure:

- consistent reporting
- clear prioritization
- reliable CI merge decisions

# Severity Levels

Three severity levels are defined:

Critical
Major
Minor

# Critical Issues

Critical issues indicate violations that break the architecture or system integrity.

These issues MUST block merges and must be fixed immediately.

Examples:

- Architecture layer violations
- Illegal cross-layer dependencies
- Core layer importing Service layer
- Shared layer importing Core or Service
- Forbidden dependency paths
- Circular dependencies between packages
- Package boundary violations
- Missing required public exports
- Breaking TypeScript build configuration

CI Action:

BLOCK MERGE

# Major Issues

Major issues affect maintainability or correctness but do not immediately break architecture.

These issues should be fixed before release.

Examples:

- Incorrect dependency declarations
- Invalid import paths
- Missing index.ts exports
- Inconsistent TypeScript configuration
- Missing required tsconfig fields
- Improper folder structure
- Incomplete package configuration
- Improper module boundaries

CI Action:

MERGE WITH WARNING

# Minor Issues

Minor issues affect code readability, documentation, or style.

They do not affect architecture or system functionality.

Examples:

- Missing file header comments
- Incomplete JSDoc comments
- Code style inconsistencies
- Formatting issues
- Missing explanation comments
- Non-standard naming patterns

CI Action:

ALLOW MERGE

# Severity Assignment Rules

AI must classify issues according to the following priority:

1. Architecture violations → Critical
2. Dependency violations → Critical
3. Import rule violations → Major
4. TypeScript configuration issues → Major
5. Folder structure inconsistencies → Major
6. Comment or style issues → Minor

# Example Issue Classification

Example 1

Issue:
core-api importing from service layer

Severity:
Critical

Example 2

Issue:
package missing index.ts export

Severity:
Major

Example 3

Issue:
missing file header comment

Severity:
Minor

# Reporting Requirements

All AI audit reports must include severity classification.

Example table:

| ID     | Severity | Rule            | Package     | File         | Issue                               |
| ------ | -------- | --------------- | ----------- | ------------ | ----------------------------------- |
| VX-001 | Critical | Dependency Rule | core-api    | apiClient.ts | Illegal dependency on service layer |
| VX-002 | Major    | Import Rule     | core-tenant | tenant.ts    | Invalid relative import             |
| VX-003 | Minor    | Comment Rule    | core-utils  | string.ts    | Missing file header comment         |

# Issue ID Format

All issues must include a unique identifier.

Format:

VX-001
VX-002
VX-003

Prefix:

VX = Vxture

# Goal

This standard ensures that AI audit results are:

- consistent
- actionable
- suitable for automated CI enforcement
