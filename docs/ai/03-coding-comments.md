# Vxture AI Coding Comment Guidelines

**Version**: 1.3.0
**Last Updated**: 2026-06-08

This document defines the **code commenting standards** for the Vxture Monorepo.
It is intended for developers and AI tools to ensure readability, maintainability, and consistent style.

---

## 1. General Principles

- **Explain "why", not "what"** – Code is self-explanatory for _what_ it does. Comments should explain the reasoning, constraints, or trade-offs behind a decision.
- **No noise** – Omit comments that restate the code. A comment that adds no information is worse than no comment.
- **Stay in sync** – A comment that contradicts the code is actively harmful. Update comments as part of every code change, not as an afterthought.
- **Be consistent** – Follow this standard across all layers, packages, and languages. Inconsistency erodes readability over time.

> **Project-wide constraints:**
>
> - Comment language: **English** — all code comments must be written in English; identifiers remain in English. (Policy changed 2026-06-08; pre-existing Chinese comments are migrated to English in separate batches. User-facing string literals are product copy and are out of scope for this rule.)
> - Every file must declare `@package`, `@layer`, `@category` in its file header — see Section 2.

---

## 2. File Header Comment

Core files support two header styles:

### Full Style (Recommended for complex files)

```typescript
/**
 * filename.ts - short description (English)
 * @package  @vxture/[package-name]
 * @layer    Infrastructure | Application | Domain | Presentation | Shared
 * @category utils | service | router | component | types | module | ...
 * @description
 *   Detailed description of the file's purpose and responsibility (English)
 *
 * @author ${USER}           // use "AI-Generated" for AI-generated files
 * @date ${DATE} ${TIME}
 */
```

### Simple Style (For small, focused files)

```typescript
/**
 * filename.ts - short description (English)
 * @package  @vxture/[package-name]
 * @layer    Infrastructure
 * @category utils
 */
```

---

## 3. Section Comments

Use section separators to organize code in files longer than 80 lines:

```typescript
// ============================================================================
// Types
// ============================================================================

// ============================================================================
// Constants
// ============================================================================

// ============================================================================
// Components / Hooks Implementation
// ============================================================================
```

Common section names: `Types` / `Constants` / `Helpers` / `Components` / `Hooks Implementation` / `Exports`

---

## 4. Interface / Type Comments

```typescript
/**
 * Interface description
 */
interface ExampleProps {
  /** Property description */
  readonly property?: Type;
}
```

---

## 5. Function Comments

```typescript
/**
 * Function description
 *
 * @param param - Parameter description
 * @returns Description of the return value
 * @throws {ErrorType} When and why this error is thrown
 */
export function functionName(param: Type): ReturnType {
  // Implementation...
}
```

> Functions with `throw` statements must declare `@throws`.

---

## 6. Enum Comments

```typescript
/**
 * Enum description
 */
export enum EExample {
  /** Member description */
  MEMBER = "value",
}
```

---

## 7. 跨层引用注释

任何跨越架构层的 import 必须在当行添加 `// ⚠️ 跨层引用` 并说明原因：

```typescript
// ⚠️ 跨层引用：仅引入类型，不引入运行时依赖
import type { SomeType } from "@vxture/bff-website";

// ⚠️ 跨层引用：设计系统内部模块共享，已在 AGENTS.md G2 说明
import { tokens } from "../design-tokens";
```

无理由的跨层引用视为架构违规，会被 dep-cruiser 拦截。

---

## 8. AI Usage Notes

### Mandatory

- Set `@author` to `AI-Generated` and `@date` to the actual generation date.
- All exported functions require JSDoc with `@param` and `@returns`; add `@throws` when exceptions exist.
- Files longer than 80 lines must use section comments (see Section 3).
- All comments in English; identifiers in English.
- When modifying existing code, update all affected comments.

### Prohibited

- Do not generate comments that merely restate the code (e.g. `// 循环`, `// 定义变量`).
- Do not omit `@throws` when a function has known exception paths.
- Do not use a `@layer` value that does not match the file's actual layer in the monorepo.
- Do not write cross-layer imports without `// ⚠️ 跨层引用` and a reason.
