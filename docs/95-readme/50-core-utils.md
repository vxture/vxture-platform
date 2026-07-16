# @vxture/core-utils — Platform-level Utilities

> Usage documentation for developers. Development specifications can be found in `AGENTS.md`.

---

## Overview

Platform-level general utilities: logging, environment detection, type guards, and utility types.

Difference from `@vxture/shared`:

- **shared**: Pure general utilities, platform-agnostic
- **core-utils**: Platform-aware utilities (structured logging, environment detection)

---

## Installation

```bash
pnpm add @vxture/core-utils
```

---

## Quick Start

### Logging Utilities

```typescript
import {
  VxLogger,
  logger,
  LogLevel,
  DEFAULT_LOGGER_CONFIG,
} from "@vxture/core-utils";

// Use default logger
logger.info("Hello", { user: "123" });

// Create custom logger
const customLogger = new VxLogger({
  level: LogLevel.DEBUG,
  context: "MyApp",
  enableTimestamp: true,
  enableColors: true,
});
customLogger.debug("Debug message");

// Child logger with fixed context
const childLogger = customLogger.child("SubModule");
childLogger.warn("Warning");
childLogger.error("Error occurred");
childLogger.fatal("Fatal error");
```

### Environment Detection

```typescript
import {
  getNodeEnv,
  isProduction,
  isDevelopment,
  isTest,
  isStaging,
  isNode,
  isBrowser,
} from "@vxture/core-utils";

console.log(getNodeEnv()); // 'development'
console.log(isProduction()); // true/false
console.log(isNode()); // true/false
console.log(isBrowser()); // true/false
```

### Type Guards

```typescript
import {
  isString,
  isNumber,
  isBoolean,
  isFunction,
  isSymbol,
  isObject,
  isArray,
  isDefined,
  isNotNull,
  isPresent,
  isEmptyObject,
  isEmptyArray,
  isNonEmptyString,
  isValidUrl,
  isUuid,
} from "@vxture/core-utils";

function processValue(value: unknown) {
  if (isString(value)) {
    return value.toUpperCase();
  }
  if (isNumber(value)) {
    return value * 2;
  }
  if (isPresent(value)) {
    // value is neither null nor undefined
  }
  if (isValidUrl(value)) {
    // value is a valid URL string
  }
  if (isUuid(value)) {
    // value is a valid UUID v4
  }
}
```

---

## API

### Logging

| Export                  | Type     | Description                                      |
| ----------------------- | -------- | ------------------------------------------------ |
| `VxLogger`              | Class    | Logger class with context binding                |
| `logger`                | Instance | Default logger instance                          |
| `LogLevel`              | Const    | Log level enum (DEBUG, INFO, WARN, ERROR, FATAL) |
| `DEFAULT_LOGGER_CONFIG` | Const    | Default logger configuration                     |

### VxLogger Methods

| Method                      | Description                            |
| --------------------------- | -------------------------------------- |
| `debug(message, metadata?)` | Debug level log                        |
| `info(message, metadata?)`  | Info level log                         |
| `warn(message, metadata?)`  | Warn level log                         |
| `error(message, metadata?)` | Error level log                        |
| `fatal(message, metadata?)` | Fatal level log                        |
| `child(context)`            | Create child logger with fixed context |

### Environment

| Export            | Type     | Description                |
| ----------------- | -------- | -------------------------- |
| `getNodeEnv()`    | Function | Get NODE_ENV value         |
| `isProduction()`  | Function | Is production environment  |
| `isDevelopment()` | Function | Is development environment |
| `isTest()`        | Function | Is test environment        |
| `isStaging()`     | Function | Is staging environment     |
| `isNode()`        | Function | Is Node.js environment     |
| `isBrowser()`     | Function | Is browser environment     |

### Type Guards

| Category       | Exports                                                       |
| -------------- | ------------------------------------------------------------- |
| Basic types    | `isString`, `isNumber`, `isBoolean`, `isFunction`, `isSymbol` |
| null/undefined | `isDefined`, `isNotNull`, `isPresent`                         |
| Object/Array   | `isObject`, `isArray`, `isEmptyObject`, `isEmptyArray`        |
| String content | `isNonEmptyString`, `isValidUrl`, `isUuid`                    |

### Utility Types

| Export            | Description               |
| ----------------- | ------------------------- |
| `Maybe<T>`        | `T \| null \| undefined`  |
| `Nullable<T>`     | `T \| null`               |
| `Optional<T>`     | `T \| undefined`          |
| `Class<T>`        | Constructor type          |
| `FunctionType`    | Any function type         |
| `DeepPartial<T>`  | Deep partial              |
| `DeepReadonly<T>` | Deep readonly             |
| `LogRecord`       | Log record type           |
| `LoggerConfig`    | Logger configuration type |

---

## Directory Structure

```
src/
├── utils/
│   ├── logger.utils.ts         # Logging utilities
│   ├── env.utils.ts            # Environment detection
│   ├── type-guards.utils.ts    # Type guards
│   └── index.ts
├── types/
│   ├── utils.types.ts          # Utility types
│   └── index.ts
└── index.ts                    # Unified export
```
