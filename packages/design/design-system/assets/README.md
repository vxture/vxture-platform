# Design Assets

This directory stores platform-level visual assets that should keep one shared identity across Vxture applications.

Runtime apps should copy the needed assets into their own `public/assets/...` directory so Next.js can serve them without cross-package static-file assumptions.

Current assets:

- `ai/ai-agent-icon-32.gif`: unified animated AI agent identity icon for toolbar/header usage.
- `ai/ai-agent-icon-48.gif`, `ai/ai-agent-icon-64.gif`, `ai/ai-agent-icon-128.gif`: larger runtime variants for higher-density placements.
- `ai/ai-agent-icon.gif`: original/full-size source.
