# Vxture AI Audit CI Gate

This document defines the conditions for blocking merges based on AI audit results.

# Merge Blocking Rules

The following issues must block a merge:

## Critical Issues

- Architecture layer violations
- Illegal cross-layer dependencies
- Forbidden imports between packages

## Major Issues

- Broken TypeScript configuration
- Missing package exports
- Invalid dependency declarations

## Minor Issues

These do NOT block merges:

- missing comments
- style inconsistencies
- formatting issues

# CI Decision

PASS

No critical issues detected.

WARNING

Only minor issues detected.

FAIL

Critical or major issues detected.

# Goal

Ensure architectural integrity of the Vxture monorepo during development.
