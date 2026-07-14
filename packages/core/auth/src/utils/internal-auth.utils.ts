export function resolveInternalAuthToken(): string {
  const token = process.env["AUTH_INTERNAL_TOKEN"]?.trim();
  if (token) return token;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("AUTH_INTERNAL_TOKEN is required in production");
  }
  return "vxture-local-internal-auth";
}

export function assertInternalAuth(
  headers: Record<string, string | string[] | undefined>,
): void {
  const raw = headers["x-vxture-internal-auth"];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (token !== resolveInternalAuthToken()) {
    throw new Error("Unauthorized internal auth request");
  }
}
