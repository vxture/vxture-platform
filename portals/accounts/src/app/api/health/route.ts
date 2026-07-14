import { NextResponse } from "next/server";

// Dependency-free liveness probe for the container healthcheck: proves the
// Next.js server is up and listening, without touching any BFF/DB/Redis.
// See docs/standards/container-healthcheck-standard.md.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
