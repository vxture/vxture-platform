TypeScript Configuration Compliance

Objective

Ensure all projects follow the monorepo TypeScript configuration standard.

Reference

docs/standards/vx-TsconfigConfig.md

Validation

Check that:

all projects extend tsconfig.base.json

packages use:

composite true
declaration true

apps use:

noEmit true

Verify strict mode is enabled globally.

Detect duplicated compiler options.
