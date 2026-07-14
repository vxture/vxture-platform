CREATE TABLE IF NOT EXISTS "VelaSession" (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "tenantId" text,
  surface text NOT NULL,
  title text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VelaSession_userId_surface_idx"
  ON "VelaSession" ("userId", surface);

CREATE INDEX IF NOT EXISTS "VelaSession_tenantId_idx"
  ON "VelaSession" ("tenantId");

CREATE TABLE IF NOT EXISTS "VelaMessage" (
  id text PRIMARY KEY,
  "sessionId" text NOT NULL REFERENCES "VelaSession"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  "toolId" text,
  "toolCallId" text,
  "toolInput" jsonb,
  "toolResult" jsonb,
  "displayHint" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VelaMessage_sessionId_idx"
  ON "VelaMessage" ("sessionId");

CREATE TABLE IF NOT EXISTS "VelaAuditLog" (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "tenantId" text,
  surface text NOT NULL,
  "toolId" text NOT NULL,
  input jsonb NOT NULL,
  result jsonb NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  "executedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VelaAuditLog_userId_idx"
  ON "VelaAuditLog" ("userId");

CREATE INDEX IF NOT EXISTS "VelaAuditLog_toolId_idx"
  ON "VelaAuditLog" ("toolId");
