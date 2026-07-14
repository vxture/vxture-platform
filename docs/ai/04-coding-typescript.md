# Vxture TypeScript Architecture

**Version**: 1.3.0
**Last Updated**: 2026-05-15
**TypeScript Version**: 5.9.3
**ECMAScript Target**: ES2023

## Overview

Vxture uses **strict TypeScript configuration** across all packages and applications
in the monorepo.

Goals:

- Strong type safety across all layers
- Consistent configuration and build behavior
- Scalable path alias strategy aligned with monorepo structure
- Compatibility with AI-assisted coding

---

# 1. Configuration Architecture

Vxture uses a **two-level tsconfig inheritance** structure:

```
tsconfig.base.json          # Global compiler rules + path aliases (root)
      ↓
{package}/tsconfig.json     # Per-package local config
```

Root-level files:

```
vxture/
├── tsconfig.base.json      # Global config (compiler options + paths)
├── tsconfig.json           # Project references (solution-style)
├── portals/
├── agent-studio/
├── agent-server/
├── bff/
├── services/
└── packages/
```

---

# 2. tsconfig.base.json

Defines global TypeScript compiler rules inherited by all packages and applications.

```jsonc
{
  "compilerOptions": {
    // 编译目标
    "target": "ES2023",
    "lib": ["ES2023"], // 不含 DOM；前端包在本地覆盖为 ["DOM", "DOM.Iterable", "ES2023"]
    "module": "ESNext",
    "moduleResolution": "bundler",

    // 严格模式（禁止在子包中单独关闭）
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,

    // 互操作
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "useDefineForClassFields": true,
    "resolveJsonModule": true,

    // 工具链
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
  },
}
```

---

# 3. Path Aliases Configuration

Path aliases are defined directly in `tsconfig.base.json`, aligned with the monorepo structure.

Rules:

- Every internal package must have a path alias
- Aliases must follow `@vxture/{group}-{name}` naming for packages
- Aliases must follow `@vxture/service-{name}` for services (no domain prefix)
- Cross-package relative imports are **forbidden**

```ts
import { debug } from "@vxture/shared"; // ✅
import { debug } from "../../../shared/shared/src"; // ❌

import { getBillingStatus } from "@vxture/service-billing"; // ✅
import { getBillingStatus } from "../../services/commerce/billing/src"; // ❌
```

---

# 4. Per-Package tsconfig.json

Every package and application must include a local `tsconfig.json`.

**Packages** (`packages/{group}/{name}/`):

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Services** (`services/{domain}/{name}/`):

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Note: Services use three levels (`../../../`) because of the two-level domain structure
`services/{domain}/{name}/`.

**Applications** (`portals/`, `agent-studio/`, `bff/`, `agent-server/`):

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src"]
}
```

Applications set `noEmit: true` because they rely on their bundler (Vite, Next.js)
for compilation — TypeScript is used for type checking only.

---

# 5. Library Build Configuration

Shared packages that are published or consumed as libraries define an additional
`tsconfig.build.json` for producing declaration files:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "emitDeclarationOnly": false
  }
}
```

Applies to: `packages/core/*`, `packages/ai/model-runtime-client`, `packages/platform/*`,
`packages/design/design-system`, `packages/shared/shared`, `services/*/*`.

---

# 6. Layer-Specific Compiler Environment

不同层的运行时环境不同，需在各包的 `tsconfig.json` 中做针对性补充。

**lib 分层策略**（最重要的差异点）：

| 层                                                        | `lib`                                                    | 说明                            |
| --------------------------------------------------------- | -------------------------------------------------------- | ------------------------------- |
| 服务端（bff、agent-server、services、core、shared）       | 继承 base 的 `["ES2023"]` — **不需要在本地声明**         | 无 DOM 类型，防止误用浏览器 API |
| 前端（portals、agent-studio、design-system、platform-\*） | `["DOM", "DOM.Iterable", "ES2023"]` — **必须在本地声明** | 覆盖 base，启用 DOM 类型        |

**NestJS 包**（bff、agent-server、services、core）额外需要：

```jsonc
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["node"], // 可选，显式限制环境类型
  },
}
```

**前端包**（portals、agent-studio）额外需要：

```jsonc
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2023"],
    "jsx": "preserve", // Next.js 用 preserve；纯 React 库用 react-jsx
    "noEmit": true,
    "isolatedModules": true, // Next.js 要求
  },
}
```

**共享包**（`@vxture/shared`、`@vxture/core-*`）：

- 继承 base `lib: ["ES2023"]`，禁止引用 DOM API 和 Node.js 专有 API
- 若有环境差异行为，使用运行时检测（`typeof window !== "undefined"`）

---

# 7. Barrel Export Standard

Every package exposes a **single public entry point**:

```
src/index.ts
```

All public APIs exported from this file:

```ts
export * from "./client/api-client";
export * from "./types/api.types";
export * from "./utils/request.utils";
```

Consumers always import from the package root:

```ts
import { apiClient } from "@vxture/core-api"; // ✅
import { apiClient } from "@vxture/core-api/src/client"; // ❌
```

Source code must never import from `dist/`.

---

# 8. File Naming Convention

| Type             | Convention          | Example              |
| ---------------- | ------------------- | -------------------- |
| React components | PascalCase `.tsx`   | `Button.tsx`         |
| React hooks      | camelCase `use*.ts` | `useTheme.ts`        |
| Type definitions | `*.types.ts`        | `user.types.ts`      |
| Constants        | `*.constants.ts`    | `auth.constants.ts`  |
| Utilities        | `*.utils.ts`        | `format.utils.ts`    |
| API clients      | `*.client.ts`       | `api.client.ts`      |
| Context helpers  | `*.context.ts`      | `tenant.context.ts`  |
| Service logic    | `*.service.ts`      | `billing.service.ts` |
| Repository logic | `*.repository.ts`   | `user.repository.ts` |
| Router modules   | `*.router.ts`       | `order.router.ts`    |
| Middleware       | `*.middleware.ts`   | `auth.middleware.ts` |

Avoid generic names: `helpers.ts`, `utils.ts`, `misc.ts`.
Use domain-specific names instead.

---

# 9. Import Order Convention

```ts
// 1. External libraries
import React from "react";
import { z } from "zod";

// 2. Internal @vxture packages
import { getTenantId } from "@vxture/core-tenant";
import { Button } from "@vxture/design-system";

// 3. Relative imports (within same package)
import { formatDate } from "./utils/format.utils";
import type { UserType } from "./types/user.types";
```

Use `import type` for type-only imports.

---

# 10. Strictness Policy

以下选项**全部在 `tsconfig.base.json` 中启用，禁止在任何子包中单独关闭**：

```
strict: true                    // 含 noImplicitAny、strictNullChecks 等
exactOptionalPropertyTypes: true
noUncheckedIndexedAccess: true
noUnusedLocals: true
noUnusedParameters: true
noImplicitReturns: true
noFallthroughCasesInSwitch: true
```

> 不需要在子包的 tsconfig 中重复声明上述选项。

Prohibited practices:

```ts
const data: any           // ❌ use unknown and narrow
"strict": false           // ❌ never disable
// @ts-ignore             // ❌ only with written justification comment
```

Cross-package relative imports:

```ts
import { x } from "../../../packages/core/api/src"; // ❌
import { x } from "@vxture/core-api"; // ✅
```

Duplicated type definitions across packages:

```ts
// ❌ define shared types in @vxture/shared, not per-package
export type ID = string;
```

---

# 11. AI Coding Rules

AI generated code must:

1. Always extend `tsconfig.base.json` — never define compiler options from scratch
2. Use three-level path for packages and services: `"extends": "../../../tsconfig.base.json"`
3. Use two-level path for applications: `"extends": "../../tsconfig.base.json"`
4. Never use `any` — use `unknown` and narrow types explicitly
5. Never disable strict rules — document with a comment if `@ts-ignore` is absolutely required
6. Always add new public APIs to `src/index.ts`
7. Use `@vxture/*` workspace aliases for all cross-package imports — no relative cross-package paths
8. Never import from `dist/`
9. Use `import type` for type-only imports
10. Follow file naming conventions — PascalCase components, camelCase hooks, domain-specific names for everything else
11. Service imports always use `@vxture/service-{name}` — never reference the domain path

---

End of document.
