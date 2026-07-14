Architecture Compliance Check

Objective

Verify that code respects the Vxture architecture layers.

Tasks

Check imports across the repository.

Detect violations of layer dependency rules.

Rules

Shared must not import any other layer.

Core may only import Shared.

Service may import:

Core
Shared

Portal may import:

Platform
Service
Core
Shared

Report violations with:

file path
invalid import
recommended fix
