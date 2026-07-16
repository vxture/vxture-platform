# Vxture Core Layer Architecture

**Version**: 1.4.0
**Last Updated**: 2026-05-12

## Overview

The **Core Layer** is the **platform infrastructure layer** of the Vxture Monorepo.

It provides reusable, framework-agnostic utilities and services consumed by the Service Layer,
BFF Layer, and Agent Server Layer. It does not contain business logic or UI components.

The Core Layer ensures:

- Consistency across multi-tenant applications
- Type safety and modular architecture
- Centralized platform primitives for authentication, locale, configuration, and API handling

Core packages are **stable platform primitives** that higher layers rely on.

---

# 1. Package Location

All core packages follow the `packages/{group}/{name}/` convention:

```
packages/core/
├── api/        # @vxture/core-api
├── auth/       # @vxture/core-auth
├── config/     # @vxture/core-config
├── database/   # @vxture/core-database
├── locale/     # @vxture/core-locale
├── mail/       # @vxture/core-mail
├── tenant/     # @vxture/core-tenant
└── utils/      # @vxture/core-utils
```

---

# 2. Responsibilities

## core-api — API Infrastructure

Standardized tools for API communication.

- Centralized API request handling
- Standardized request/response types
- Authentication token injection
- Request interceptors
- Error normalization
- Retry / timeout helpers

Ensures all layers communicate with APIs consistently.

## core-auth — Authentication Primitives

Platform-level authentication utilities.

- Token validation
- Session helpers
- Role-based access utilities
- Authorization helpers

Core-auth provides **platform primitives only** — not business-level permissions.
Business permission logic belongs in the Service Layer.

## core-config — Configuration Management

- Environment-aware configuration loading
- Typed configuration access
- Multi-environment support (dev, staging, production)

## core-locale — Internationalization

- Locale resolution
- Translation helpers
- Date / number / currency formatting
- Locale context propagation

Ensures consistent multilingual support across portals and agents.

## core-tenant — Multi-Tenant Context

- Tenant ID resolution
- Tenant context propagation
- Tenant configuration lookup
- Tenant-specific data isolation

Allows all layers to operate within tenant-aware environments.

## core-utils — Platform Utilities

General-purpose platform helpers:

- Logging helpers
- Environment utilities
- Type guards
- Generic helpers

Supports both server and browser environments.

## core-database — Database Infrastructure

NestJS-based Prisma database module for platform-level persistence.

- Provides `PrismaModule` / `PrismaService` for PostgreSQL access via Prisma Client
- Manages DDL migrations under `packages/core/database/prisma/`
- **Server-side only**: not consumable by frontend or browser code
- **Global NestJS module**: import `PrismaModule` once in `AppModule`; `PrismaService` is injectable anywhere
- Exposes typed Prisma Client generated from the platform schema

> **Cross-dependency constraint**: `core-database` reads `DATABASE_URL` directly from
> `process.env`. Consumer BFFs call `VxConfigModule.register()` at startup to load `.env`
> files before any service constructs — same pattern as `core-mail`.

## core-mail — Transactional Email

NestJS-based transactional email service built on nodemailer.

- SMTP transport configured via `SMTP_*` environment variables
- **No-op mode**: when `SMTP_HOST` is absent, `send()` logs a warning and returns silently — guaranteed safe in local and CI environments without SMTP credentials
- **Global NestJS module**: import `MailModule` once in `AppModule`; `MailService` is then injectable anywhere without re-importing the module
- Single `send(MailPayload)` interface; does not expose nodemailer internals

> **Cross-dependency constraint**: `core-mail` reads `SMTP_*` directly from `process.env`
> rather than delegating to `core-config`. This is intentional — core packages cannot
> depend on each other. Consumer BFFs are expected to call `VxConfigModule.register()` at
> startup, which loads `.env` files before any service constructs.

---

# 3. Dependency Rules

Core packages depend only on `@vxture/shared`.

```
core-* → @vxture/shared  ✅
core-* → service-*       ❌
core-* → bff-*           ❌
core-* → ai-sdk          ❌
core-* → design-system   ❌
core-* → platform-*      ❌
core-* → React / Next.js ❌
```

**例外**：`core-auth` 允许引入 `core-config` 以读取 JWT 密钥等平台级配置。此为 core 层内部唯一被允许的跨包引用。

Core must remain **framework-agnostic** where possible. `core-mail` and `core-database` are the
NestJS-specific exceptions — both ship `@Global() @Module()` wrappers and are only consumed by
server-side BFFs and services. All other core packages remain runnable in both Node.js and browser.

---

# 4. Internal Package Structure

Each core package follows this layout:

```
packages/core/{name}/
├── package.json
├── tsconfig.json
└── src/
    ├── client/       # API clients (*.client.ts)
    ├── context/      # Context utilities (*.context.ts)
    ├── types/        # TypeScript definitions (*.types.ts)
    ├── utils/        # Reusable helpers (*.utils.ts)
    └── index.ts      # Single public export entry
```

---

# 5. File Naming Convention

| Type             | Convention       |
| ---------------- | ---------------- |
| Type definitions | `*.types.ts`     |
| Constants        | `*.constants.ts` |
| Utilities        | `*.utils.ts`     |
| API clients      | `*.client.ts`    |
| Context helpers  | `*.context.ts`   |

Avoid generic names like `helpers.ts`, `utils.ts`, `misc.ts`.
Prefer domain-specific names like `tenant.utils.ts`, `auth.client.ts`.

---

# 6. Public Export Rules

Each core package exposes **one public entry point**:

```
src/index.ts
```

All public APIs are exported from this file:

```ts
export * from "./client/api-client";
export * from "./types/api.types";
```

Consumers import from the package root only:

```ts
import { apiClient } from "@vxture/core-api"; // ✅
import { apiClient } from "@vxture/core-api/src/client/api-client"; // ❌
```

---

# 7. Example Usage

```ts
import { apiClient } from "@vxture/core-api";
import { validateToken } from "@vxture/core-auth";
import { getConfig } from "@vxture/core-config";
import { PrismaModule, PrismaService } from "@vxture/core-database";
import { translate } from "@vxture/core-locale";
import { MailModule, MailService } from "@vxture/core-mail";
import { getTenantId } from "@vxture/core-tenant";
import { log } from "@vxture/core-utils";

const tenantId = getTenantId();
const response = await apiClient.get(`/users?tenant=${tenantId}`);
log("Fetched users:", response);

const label = translate("welcome_message");

// core-mail — NestJS usage (server-side BFF only)
// 1. AppModule imports MailModule once
// 2. Any router / service can inject MailService directly
await mailService.send({
  to: "user@example.com",
  subject: "Welcome to Vxture",
  html: "<p>Hello!</p>",
});
```

---

# 8. Consumers

Core packages are consumed by:

| Consumer         | Core packages used                                                      |
| ---------------- | ----------------------------------------------------------------------- |
| `bff/*`          | `core-auth`, `core-config`, `core-tenant`, `core-mail`, `core-database` |
| `agent-server/*` | `core-config`, `core-tenant`, `core-api`                                |
| `services/*`     | `core-config`, `core-database`                                          |

`core-mail` is consumed exclusively by Portal BFFs (`admin-bff`, `console-bff`) for
server-side transactional email notifications. `core-database` is consumed by BFFs and
services that require direct database access. Neither is available to frontend code
(`portals/`, `agent-studio/`) — those layers communicate with BFFs over HTTP.

Core packages are **not** consumed directly by frontend code (`portals/`, `agent-studio/`).
Frontend layers access core capabilities through their BFF over HTTP.

---

# 9. AI Modification Rules

AI must not:

- Add business logic to core packages
- Add UI components or React dependencies
- Import from service, bff, ai-sdk, or platform packages
- Change layer dependencies
- Move files across packages without updating exports

AI must:

- Keep each package focused on a single responsibility
- Export all public APIs via `src/index.ts`
- Use domain-specific file naming conventions
- Preserve framework-agnostic constraints
- Follow strict TypeScript — no `any` types

---

End of document.
