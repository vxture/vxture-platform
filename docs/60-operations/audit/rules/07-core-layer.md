Core Layer Validation

Location

packages/core-\*

Responsibilities

Core layer provides platform infrastructure.

Examples

API utilities
authentication helpers
tenant context
configuration loaders
logging utilities

Rules

Core may depend on:

@vxture/shared

Core must not depend on:

services
portals
platform SDK

Core must be framework-agnostic.

Forbidden

React
Next.js
UI components
browser-specific APIs
