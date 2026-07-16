# @vxture/core-api — NestJS HTTP Client Infrastructure

> **Usage documentation for developers/AI**
> This document details how to use the features and methods of the @vxture/core-api package.
> For development constraints and specifications, please see `AGENTS.md`.

---

## 🌟 Package Overview

Unified HTTP request infrastructure: request encapsulation, interceptors, error standardization, retry/timeout.
Used by BFF, Service, and Agent Server layers. **Node.js only** (due to NestJS integration).

**Core Features:**

- Based on @nestjs/axios with NestJS DI integration
- Type-safe HTTP methods
- Automatic retry on 429 and 5xx errors
- Error normalization to VxtureError subclasses
- File upload/download support
- Context-aware requests (automatic token/tenantId injection)
- Response unwrapping with ApiResponse format

---

## 📦 Installation

```bash
pnpm add @vxture/core-api
```

---

## 🚀 Usage Example

### 1. Register VxHttpModule

First, register the module in your NestJS AppModule:

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { VxHttpModule } from "@vxture/core-api";

@Module({
  imports: [
    VxHttpModule.register({
      baseURL: "http://agent-server:3000",
      timeout: 30000, // 30 seconds
      retries: 2, // retry 2 times on failures
      headers: {
        "x-api-version": "v1",
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Inject and Use VxHttpClient

```typescript
// user.service.ts
import { Injectable } from "@nestjs/common";
import { VxHttpClient } from "@vxture/core-api";
import type { ApiResponse, User } from "../types";

@Injectable()
export class UserService {
  constructor(private readonly httpClient: VxHttpClient) {}

  async getUsers(): Promise<User[]> {
    return this.httpClient.get<User[]>("/users");
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return this.httpClient.post<User>("/users", userData);
  }

  async uploadAvatar(fileBuffer: Buffer, filename: string): Promise<string> {
    return this.httpClient.upload<string>(
      "/users/avatar",
      fileBuffer,
      filename,
      {
        headers: {
          "content-type": "image/jpeg",
        },
      },
    );
  }
}
```

### 3. Context-Aware Requests (BFF Usage)

For BFF applications that need to pass through authentication and tenant context:

```typescript
// user.router.ts
import { Controller, Get, Headers } from "@nestjs/common";
import { VxHttpClient } from "@vxture/core-api";
import type { RequestContext } from "@vxture/core-api";

@Controller("users")
export class UserController {
  constructor(private readonly httpClient: VxHttpClient) {}

  @Get()
  async getUsers(
    @Headers("authorization") token: string,
    @Headers("x-tenant-id") tenantId: string,
  ) {
    const context: RequestContext = {
      accessToken: token.replace("Bearer ", ""),
      tenantId,
    };

    return this.httpClient.getWithContext<ApiResponse<User[]>>(
      "/api/users",
      context,
    );
  }
}
```

### 4. File Download

```typescript
async downloadReport(): Promise<Buffer> {
  const buffer = await this.httpClient.download('/reports/monthly');
  return buffer;
}
```

---

## 📚 API Reference

### VxHttpClient Methods

#### Standard HTTP Methods

```typescript
// GET request
async get<T>(path: string, options?: RequestOptions): Promise<T>

// POST request
async post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T>

// PUT request
async put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T>

// PATCH request
async patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T>

// DELETE request
async delete<T>(path: string, options?: RequestOptions): Promise<T>
```

#### File Operations

```typescript
// File upload
async upload<T>(
  path: string,
  file: Buffer | NodeJS.ReadableStream,
  filename: string,
  options?: UploadOptions
): Promise<T>

// File download
async download(path: string, options?: RequestOptions): Promise<Buffer>
```

#### Context-Aware Methods

```typescript
// GET with context
async getWithContext<T>(
  path: string,
  context: RequestContext,
  options?: RequestOptions
): Promise<T>

// POST with context
async postWithContext<T>(
  path: string,
  data: unknown,
  context: RequestContext,
  options?: RequestOptions
): Promise<T>
```

#### Raw Response Access

```typescript
// Return full AxiosResponse without unwrapping
async rawRequest<T = unknown>(
  method: string,
  path: string,
  data?: unknown,
  options?: RequestOptions
): Promise<AxiosResponse<T>>
```

### Configuration Types

```typescript
// Request options
interface RequestOptions {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  raw?: boolean; // return full response if true
  responseType?: "json" | "arraybuffer" | "stream" | "blob";
}

// Upload options
interface UploadOptions extends RequestOptions {
  onProgress?: (percent: number) => void;
}

// Request context
interface RequestContext {
  accessToken?: string; // automatically added to Authorization header
  tenantId?: string; // automatically added to x-tenant-id header
  requestId?: string; // automatically added to x-request-id header
}

// HTTP module options
interface VxHttpModuleOptions {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}
```

---

## 🛠 Response Helpers

The `@vxture/core-api` package provides utilities for building standard API responses:

```typescript
import { ok, fail, buildPageResult, safePageQuery } from "@vxture/core-api";

// Success response
return ok({ id: 1, name: "John Doe" });
// Returns: { success: true, data: {...}, code: 'OK', timestamp: '2026-03-15T10:30:00Z' }

// Failure response
return fail("NOT_FOUND", "User with id=123 not found");
// Returns: { success: false, data: null, code: 'NOT_FOUND', message: 'User not found', ... }

// Pagination
const users = await prisma.user.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

return ok(buildPageResult(users, total, { page, pageSize }));
```

---

## 📁 Directory Structure

```
packages/core/api/
├── src/
│   ├── client/              # VxHttpClient implementation
│   │   ├── http.client.ts
│   │   └── index.ts
│   ├── module/              # VxHttpModule for NestJS DI
│   │   ├── http.module.ts
│   │   └── index.ts
│   ├── types/               # Type definitions
│   │   ├── api.types.ts
│   │   └── index.ts
│   ├── utils/               # Helper functions
│   │   ├── error.utils.ts   # HTTP status → VxtureError mapping
│   │   ├── response.utils.ts # Response builders
│   │   └── index.ts
│   └── index.ts             # Single public export
├── README.md                # Usage documentation (this file)
├── AGENTS.md                # AI coding guidelines
└── package.json             # Package configuration
```

---

## 🔄 Error Handling

All HTTP errors are automatically normalized to `@vxture/shared` VxtureError subclasses:

```typescript
import { NotFoundError, ValidationError } from "@vxture/shared";

try {
  await client.get("/nonexistent");
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle 404
  } else if (error instanceof ValidationError) {
    // Handle 400
  }
}
```

---

## 📝 Update Log

### v1.2.2

- Update all file comments to English
- Standardize package version
- Fix TypeScript definitions

### v1.2.0

- Add context-aware request methods
- File upload/download support
- Improve error normalization

### v1.1.0

- Add raw request access
- Enhance retry logic
- Add response type support

### v1.0.0

- Initial version
- Basic HTTP methods
- Error normalization
- Retry and timeout
