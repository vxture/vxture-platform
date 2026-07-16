# Vxture AI Audit Scope Configuration

This file defines the scope for AI-based repository audits.

It is used by AI prompts to determine:

- Which packages should be audited
- Which packages are complete
- Which directories should be ignored

This prevents false positives when parts of the repository are still under development.

# Completed Packages

Only the following packages are considered complete and must be audited.

## Shared Layer

@vxture/shared/{constants, types, utils}

## Core Layer

@vxture/core-api
@vxture/core-auth
@vxture/core-config
@vxture/core-tenant
@vxture/core-locale
@vxture/core-utils

## Design System

@vxture/design-tokens
@vxture/design-system
@vxture/ui-kit
@vxture/icons

# Audit Directories

AI should only scan the following directories:

packages/shared
packages/core
packages/design

# Ignore Directories

AI must ignore these directories:

portals
business
services
scripts
tests

# Ignore Conditions

AI must NOT report issues for:

- incomplete packages
- placeholder packages
- empty folders
- experimental packages

# Notes

The repository is under active development.

Packages not listed in "Completed Packages" should be treated as incomplete and excluded from audits.

AI must only evaluate completed packages to avoid false positives.
