# @vxture/core-auth — Authentication Infrastructure

> **Usage documentation for developers/AI**
> This document details how to use the features and methods of the @vxture/core-auth package.
> For development constraints and specifications, please see `AGENTS.md`.

---

## 🌟 Package Overview

Platform-level authentication primitives: JWT token validation, session utilities, role and permission base types.
Provides only platform infrastructure, no business-level permission logic (business permissions belong to Service layer).

**Core Features:**

- JWT token signing and verification via @nestjs/jwt
- JWT authentication guard and role guard for NestJS
- NestJS decorators (@Public, @Roles, @CurrentUser)
- Bearer token extraction utilities
- Permission and role checking utilities
- OAuth provider interfaces and utilities
- Type-safe API design

---

## 📦 Installation

```bash
pnpm add @vxture/core-auth
```

---

## 🚀 Usage Examples

### 1. Register JWT Module

First, register JwtModule in your NestJS AppModule:

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: "1h" },
      }),
    }),
  ],
})
export class AppModule {}
```

### 2. Use Guards and Decorators

```typescript
// user.controller.ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  Public,
  Roles,
  CurrentUser,
  JwtAuthGuard,
  RolesGuard,
} from "@vxture/core-auth";
import type { AuthUser, PlatformRole } from "@vxture/core-auth";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  @Get("profile")
  getProfile(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get("profile/:field")
  getProfileField(
    @CurrentUser("email") email: string,
    @CurrentUser("userId") userId: string,
  ) {
    return { email, userId };
  }

  @Get("admin")
  @Roles(PlatformRole.ADMIN)
  getAdminOnly() {
    return { message: "Admin only" };
  }

  @Get("tenant-admin")
  @Roles(PlatformRole.TENANT_ADMIN, PlatformRole.ADMIN)
  getTenantAdminOnly() {
    return { message: "Tenant admin or admin" };
  }

  @Get("public")
  @Public()
  getPublic() {
    return { message: "Public endpoint" };
  }
}
```

### 3. Use VxJwtClient

```typescript
// auth.service.ts
import { Injectable } from "@nestjs/common";
import { VxJwtClient } from "@vxture/core-auth";
import type { JwtAccessPayload, JwtRefreshPayload } from "@vxture/core-auth";

@Injectable()
export class AuthService {
  constructor(private readonly jwtClient: VxJwtClient) {}

  async login(user: any) {
    const accessPayload: Omit<JwtAccessPayload, "iat" | "exp"> = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      provider: "password",
    };

    const accessToken = this.jwtClient.signAccessToken(accessPayload);
    const refreshToken = this.jwtClient.signRefreshToken(
      { sub: user.id, tenantId: user.tenantId, jti: "unique-id" },
      process.env.JWT_REFRESH_SECRET,
      "7d",
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string) {
    return this.jwtClient.verifyAccessToken(token);
  }

  decodeAccessToken(token: string) {
    return this.jwtClient.decodeAccessToken(token);
  }
}
```

### 4. Use Utility Functions

```typescript
import {
  extractBearerToken,
  extractBearerTokenFromHeaders,
  isTokenExpired,
  getTokenRemainingMs,
  hasPermission,
  hasRole,
  isAdmin,
  isTenantAdmin,
  isValidProvider,
  buildOAuthProfile,
  generateJti,
} from '@vxture/core-auth';
import type { AuthUser } from '@vxture/core-auth';

// Extract Bearer token
const token = extractBearerToken('Bearer eyJhbGci...');

// Extract from headers object
const headers = { authorization: 'Bearer eyJhbGci...' };
const tokenFromHeaders = extractBearerTokenFromHeaders(headers);

// Check token expiry
const expired = isTokenExpired(token);
const remainingMs = getTokenRemainingMs(token);

// Check permissions
const user: AuthUser = {
  userId: '123',
  tenantId: '456',
  email: 'user@example.com',
  role: 'admin',
  permissions: ['read', 'write'],
  provider: 'password',
};

const canRead = hasPermission(user, 'read');
const canReadWrite = hasPermission(user, ['read', 'write'], { mode: 'all' });
const hasAdminRole = hasRole(user, 'admin');
const isUserAdmin = isAdmin(user);
const isUserTenantAdmin = isTenantAdmin(user);

// OAuth utilities
const valid = isValidProvider('dingtalk');
const oauthProfile = buildOAuthProfile({
  providerId: 'user123',
  provider: 'dingtalk',
  name: 'John Doe',
  email: 'john@example.com',
  raw: { ... },
});
const jti = generateJti('user123');
```

---

## 📚 API Reference

### Guards

#### JwtAuthGuard

NestJS guard that validates JWT access token from request.

- Skips verification for routes marked with @Public()
- Attaches AuthUser to request.user after verification

#### RolesGuard

NestJS guard that checks user roles.

- Works with @Roles() decorator
- Requires JwtAuthGuard to run first

### Decorators

#### @Public()

Marks a route as public, skipping JWT verification.

#### @Roles(...roles: string[])

Marks required roles for a route.

```typescript
@Roles('admin', 'tenant_admin')
```

#### @CurrentUser(field?: keyof AuthUser)

Extracts current user from request.

```typescript
@CurrentUser() user: AuthUser
@CurrentUser('email') email: string
```

### VxJwtClient

```typescript
@Injectable()
export class VxJwtClient {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Signs access token
   * @param payload Access token payload without iat/exp
   */
  signAccessToken(payload: Omit<JwtAccessPayload, "iat" | "exp">): string;

  /**
   * Verifies and decodes access token
   * @throws JsonWebTokenError / TokenExpiredError
   */
  verifyAccessToken(token: string): JwtAccessPayload;

  /**
   * Decodes without verifying signature (for logging, debugging)
   */
  decodeAccessToken(token: string): JwtAccessPayload | null;

  /**
   * Signs refresh token (using separate secret)
   */
  signRefreshToken(
    payload: Omit<JwtRefreshPayload, "iat" | "exp">,
    secret: string,
    expiresIn: string,
  ): string;

  /**
   * Verifies refresh token
   */
  verifyRefreshToken(token: string, secret: string): JwtRefreshPayload;

  /**
   * Signs both access token and refresh token at once
   */
  signTokenPair(params: {
    accessPayload: Omit<JwtAccessPayload, "iat" | "exp">;
    refreshPayload: Omit<JwtRefreshPayload, "iat" | "exp">;
    refreshSecret: string;
    refreshExpires: string;
    accessExpiresIn: number;
  }): AuthTokenPair;
}
```

### Utility Functions

```typescript
// Token extraction
export function extractBearerToken(
  authHeader: string | null | undefined,
): string | undefined;

export function extractBearerTokenFromHeaders(
  headers:
    | Record<string, string | string[] | undefined>
    | { get(name: string): string | null },
): string | undefined;

// Token utilities
export function isTokenExpired(token: string): boolean;
export function getTokenRemainingMs(token: string): number;

// Permission and role check
export function hasPermission(
  user: AuthUser,
  required: string | string[],
  options?: PermissionCheckOptions,
): boolean;

export function hasRole(
  user: AuthUser,
  required: string | string[],
  options?: PermissionCheckOptions,
): boolean;

export function isAdmin(user: AuthUser): boolean;
export function isTenantAdmin(user: AuthUser): boolean;

// OAuth utilities
export function isValidProvider(value: string): value is OAuthProviderType;
export function buildOAuthProfile(params: {
  providerId: string;
  provider: OAuthProviderType;
  name: string;
  email?: string;
  avatar?: string;
  raw: Record<string, unknown>;
}): OAuthUserProfile;

export function generateJti(userId: string): string;
```

### Types

```typescript
// Enums (as const)
export const OAuthProviderType = {
  PASSWORD: "password",
  DINGTALK: "dingtalk",
  FEISHU: "feishu",
  WECHAT: "wechat",
} as const;

export const PlatformRole = {
  ADMIN: "admin",
  TENANT_ADMIN: "tenant_admin",
  MEMBER: "member",
} as const;

// JWT Payloads
export interface JwtAccessPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  role: string;
  permissions?: string[];
  provider: OAuthProviderType;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  tenantId: string;
  jti: string; // JWT ID for blacklist
  iat?: number;
  exp?: number;
}

// Auth User
export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
  provider: OAuthProviderType;
}

// OAuth Types
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
}

export interface OAuthUserProfile {
  providerId: string;
  provider: OAuthProviderType;
  email?: string;
  name: string;
  avatar?: string;
  raw: Record<string, unknown>;
}

export interface OAuthProvider {
  readonly name: OAuthProviderType;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  getUserInfo(accessToken: string): Promise<OAuthUserProfile>;
}

// Token Pair
export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// Options
export interface PermissionCheckOptions {
  mode?: "all" | "any"; // default: 'any'
}
```

---

## 🛠 Development Notes

### Business Permission Logic

This package only provides platform-level authentication infrastructure, no business-level permission logic:

```typescript
// ✅ Correct - Platform-level role check
const isAdmin = hasRole(user, PlatformRole.ADMIN);

// ❌ Incorrect - Business permission logic
const canPurchase = hasPermission(user, "purchase"); // Should be implemented in service layer
```

### Import Paths

Consumers should only import from `@vxture/core-auth`, deep path imports are forbidden:

```typescript
// ✅ Correct
import { JwtAuthGuard, RolesGuard, VxJwtClient } from "@vxture/core-auth";

// ❌ Incorrect
import { JwtAuthGuard } from "@vxture/core-auth/src/guards/jwt-auth.guard";
```

---

## 📁 Directory Structure

```
packages/core/auth/
├── src/
│   ├── client/       # VxJwtClient implementation
│   ├── decorators/   # NestJS decorators (@Public, @Roles, @CurrentUser)
│   ├── guards/       # NestJS guards (JwtAuthGuard, RolesGuard)
│   ├── types/        # Type definitions
│   ├── utils/        # Utility functions
│   └── index.ts      # Single public export
├── README.md         # Usage documentation (this file)
├── AGENTS.md         # AI coding guidelines
└── package.json      # Package configuration
```

---

## 🔄 Backward Compatibility

Package maintains backward compatibility, all deprecated APIs will be marked with `@deprecated` comments.

---

## 📝 Changelog

### v1.2.2

- Update all comments to English
- Standardize package structure

### v1.2.0

- Add OAuth provider interfaces and utilities
- Add permission check utilities
- Add JTI generation for refresh token blacklist

### v1.1.0

- Add NestJS guards and decorators
- Add VxJwtClient with @nestjs/jwt integration
- Add token extraction utilities

### v1.0.0

- Initial version
- Basic type definitions
- Platform role enum
