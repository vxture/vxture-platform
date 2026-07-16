# Vxture Agent Server Layer Architecture

**Version**: 1.3.0
**Last Updated**: 2026-05-13

## Overview

The **Agent Server Layer** contains **agent-private backend services**.

Each agent in `agent-studio/` has a paired backend in `agent-server/`.
Agent backends are independently owned, governed, and deployed by their product team.
They are fast-moving by design — stability is not a requirement at this layer.

The Agent Server Layer sits between the BFF Layer and the AI / Service / Core layers:

```
bff/{name}-bff
       ↓
agent-server/{name}
       ↓
@vxture/model-runtime-client, @vxture/service-*, @vxture/core-*
```

---

# 1. Location

```
agent-server/
├── varda/           # Varda 嵌入式助手后端
└── agent-template/ # 新 Agent 后端模板（从此分叉创建新 Agent）
```

Ruyin 后端已迁出到 `vxture/agentstudio-ruyin`，本仓不再维护其 agent-server、BFF 或 vx-worker-02 部署资产。

Each directory is an independent backend application, not a shared package.
Agent backends do not have `@vxture/*` package names.

---

# 2. Internal Structure

```
agent-server/{name}/
├── package.json
├── tsconfig.json
└── src/
    ├── routers/          # HTTP route handlers or tRPC procedures
    ├── workflows/        # AI workflow definitions
    ├── providers/        # AI model provider integrations
    ├── storage/          # Agent-private data access
    ├── services/         # Agent-private business logic
    ├── types/            # Agent-private TypeScript types
    └── index.ts          # Application entry point
```

---

# 3. Responsibilities

**Agent Server handles**:

- AI model invocations via `@vxture/model-runtime-client` (llm, rag, embedding, workflow modules)
- Agent-private workflow orchestration and multi-step processing
- Agent-private storage: read/write private data, public platform data, open network data
- Consuming platform capabilities: billing, subscription via `@vxture/service-*`
- Exposing an internal API consumed exclusively by its paired BFF

**Agent Server must not handle**:

- UI rendering or frontend concerns
- Cross-agent orchestration (each agent is independent)
- Platform-wide shared logic (belongs in `services/`)
- Direct communication with frontend (always via BFF)

---

# 4. Data Sources

Agent backends can access multiple data source categories:

| Category          | Description                       | Examples                                      |
| ----------------- | --------------------------------- | --------------------------------------------- |
| Private data      | Agent-owned persistent storage    | Agent-specific DB, vector store, file storage |
| Platform data     | Shared platform data via services | User records, billing, subscription state     |
| Open network data | External APIs and public data     | Web search, public datasets, third-party APIs |

---

# 5. AI Capabilities

Agent backends consume `@vxture/model-runtime-client` for all AI operations.
Each module is imported independently — agents use only what they need.

```ts
import { llmClient } from "@vxture/model-runtime-client/llm";
import { createRagPipeline } from "@vxture/model-runtime-client/rag";
import { embed } from "@vxture/model-runtime-client/embedding";
import { defineWorkflow } from "@vxture/model-runtime-client/workflow";
```

Supported model providers (via `@vxture/model-runtime-client/llm`):

- Doubao (豆包)
- Claude (Anthropic)
- Custom / private models

Agent backends must not integrate model providers directly.
All model calls go through `@vxture/model-runtime-client`.

---

# 6. Dependency Rules

Allowed:

```
@vxture/model-runtime-client
@vxture/service-*
@vxture/core-*
@vxture/shared
Agent-private third-party libraries
```

Forbidden:

```
Other agent-server/*    (cross-agent imports — forbidden)
@vxture/bff-*
@vxture/design-system
@vxture/platform-*
Any frontend code
```

**Cross-agent sharing rule**: Agent backends must not import each other directly.

- Shared AI capabilities → `@vxture/model-runtime-client`
- Shared domain logic → promote to `services/{domain}/{name}/`

---

# 7. BFF Relationship

Each agent backend is consumed exclusively by its paired BFF:

```
bff/varda-bff           →  agent-server/varda
bff/agent-template-bff →  agent-server/agent-template  （模板，分叉后使用）
```

The agent backend exposes an internal API (REST or tRPC).
The BFF calls this API and aggregates it with other data sources
(`@vxture/service-*`, `@vxture/core-*`) before responding to the frontend.

The frontend never communicates directly with the agent backend.
All frontend ↔ backend communication goes through the BFF.

---

# 8. Promotion Lifecycle

Agent-private logic follows a **promote-when-ready** lifecycle:

```
Stage 1 — Private
  agent-server/{agent}/src/services/
  Fast iteration. No stability requirements.
  Used only by this agent.

Stage 2 — Candidate
  Logic proves useful across multiple agents or portals.
  Team identifies the correct business domain.
  Team initiates extraction process.

Stage 3 — Promoted
  services/{domain}/{name}/
  Package name: @vxture/service-{name}
  Shared platform domain service.
  Stability guarantees apply.
  Consumed by any BFF.
```

Promotion criteria:

- Used by 2+ agents or portals
- Logic is stable and well-tested
- Domain boundary is clearly defined
- No agent-specific assumptions remain in the logic
- Correct business domain has been identified (`commerce`, `support`, etc.)

---

# 9. Agent Independence

Each agent backend is fully independent. Independence means:

- **Separate deployment** — agents deploy on their own schedule
- **Separate dependencies** — each agent manages its own `package.json`
- **Separate storage** — agents do not share databases or file systems directly
- **No cross-agent imports** — agents never import from each other's source
- **Fault isolation** — one agent backend failure does not affect other agents or the platform

---

# 10. Platform Capabilities Consumed

Agent backends consume platform capabilities through packages, not through the BFF:

| Capability                | Package                                 | Notes                             |
| ------------------------- | --------------------------------------- | --------------------------------- |
| Authentication primitives | `@vxture/core-auth`                     | Token validation, session helpers |
| Tenant context            | `@vxture/core-tenant`                   | Tenant ID resolution              |
| Configuration             | `@vxture/core-config`                   | Environment-aware config          |
| API infrastructure        | `@vxture/core-api`                      | HTTP client, interceptors         |
| Billing                   | `@vxture/service-billing`               | Billing status, usage tracking    |
| Subscription              | `@vxture/service-subscription`          | Plan validation, feature gating   |
| LLM / RAG / Embedding     | `@vxture/model-runtime-client`          | All AI model operations           |
| Workflow                  | `@vxture/model-runtime-client/workflow` | Multi-step orchestration          |

---

# 11. Varda Implementation

`agent-server/varda` is the current productized embedded assistant backend. It is paired with
`bff/varda-bff` and consumed by `agent-studio/varda`, which is embedded into `portals/admin`
and `portals/console`.

```
portals/admin
portals/console
      ↓ embeds
agent-studio/varda
      ↓ HTTP/SSE
bff/varda-bff
      ↓ internal HTTP
agent-server/varda
      ↓
@vxture/model-runtime-client, @vxture/service-billing, @vxture/service-subscription, @vxture/service-ticket
```

Varda follows the normal Agent Server rules, with these concrete responsibilities:

- Validates `CallerContext` from `varda-bff` before every chat request
- Resolves tool availability by surface (`admin` or `console`), role, and tenant context
- Runs the tool-use loop through `@vxture/model-runtime-client`
- Uses platform services for billing, subscription, and ticket data instead of duplicating domain logic
- Persists sessions and messages in Varda-owned storage through repository classes
- Exposes internal chat endpoints only to `varda-bff`; browsers never call `agent-server/varda` directly

Varda replaces the old admin-only AI assistant path. New assistant capabilities should be added to
Varda tools or promoted service APIs, not to portal-local assistant routers.

---

# 12. AI Coding Rules

When AI tools generate code for `agent-server/*`:

1. Never import from other `agent-server/*` directories
2. All AI model calls go through `@vxture/model-runtime-client` — never integrate providers directly
3. Never import `@vxture/design-system`, `@vxture/platform-*`, or any frontend package
4. Never expose routes that are called directly by `agent-studio/` — always via BFF
5. Agent-private business logic stays in `src/services/` — promote to `services/{domain}/{name}/` when reusable
6. Storage access stays in `src/storage/` — no inline DB queries in route handlers
7. All public entry points typed — no `any` types
8. Use `@vxture/model-runtime-client` modules selectively — import only what the agent needs
9. When promoting logic, identify the correct business domain before creating the service directory

---

End of document.
