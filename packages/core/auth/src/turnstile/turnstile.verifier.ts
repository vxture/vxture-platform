import { randomUUID } from "node:crypto";

export type TurnstileSurface = "tenant" | "admin";

export interface TurnstileVerifierOptions {
  enabled: boolean;
  secretKey?: string;
  allowedHostnames: string[];
  siteverifyUrl?: string;
  timeoutMs?: number;
}

export interface TurnstileVerifyInput {
  token?: string | null;
  remoteIp?: string | null;
  expectedAction?: string;
}

export interface TurnstileSiteverifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
}

export class TurnstileVerificationError extends Error {
  constructor(
    message: string,
    readonly reason:
      | "disabled"
      | "missing-token"
      | "invalid-token"
      | "missing-secret"
      | "missing-hostnames"
      | "siteverify-failed"
      | "hostname-mismatch"
      | "action-mismatch"
      | "network-error",
  ) {
    super(message);
    this.name = "TurnstileVerificationError";
  }
}

const DEFAULT_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEFAULT_TIMEOUT_MS = 3_000;
const MAX_TOKEN_LENGTH = 2048;

export class TurnstileVerifier {
  private readonly siteverifyUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: TurnstileVerifierOptions) {
    this.siteverifyUrl = options.siteverifyUrl ?? DEFAULT_SITEVERIFY_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  static fromEnv(
    surface: TurnstileSurface,
    env: NodeJS.ProcessEnv = process.env,
  ): TurnstileVerifier {
    const prefix =
      surface === "admin" ? "CF_TURNSTILE_ADMIN" : "CF_TURNSTILE_TENANT";
    const fallbackHostnames = parseHostnames(
      env.CF_TURNSTILE_ALLOWED_HOSTNAMES,
    );
    const surfaceHostnames = parseHostnames(env[`${prefix}_ALLOWED_HOSTNAMES`]);

    const secretKey = env[`${prefix}_SECRET_KEY`]?.trim();
    const siteverifyUrl = env.CF_TURNSTILE_SITEVERIFY_URL?.trim();
    return new TurnstileVerifier({
      enabled: parseBoolean(env.CF_TURNSTILE_ENABLED),
      ...(secretKey ? { secretKey } : {}),
      allowedHostnames:
        surfaceHostnames.length > 0 ? surfaceHostnames : fallbackHostnames,
      ...(siteverifyUrl ? { siteverifyUrl } : {}),
    });
  }

  async verify(
    input: TurnstileVerifyInput,
  ): Promise<TurnstileSiteverifyResponse | null> {
    if (!this.options.enabled) {
      return null;
    }

    const token = input.token?.trim();
    if (!token) {
      throw new TurnstileVerificationError(
        "Turnstile token is required",
        "missing-token",
      );
    }
    if (token.length > MAX_TOKEN_LENGTH) {
      throw new TurnstileVerificationError(
        "Turnstile token is too long",
        "invalid-token",
      );
    }
    if (!this.options.secretKey) {
      throw new TurnstileVerificationError(
        "Turnstile secret key is not configured",
        "missing-secret",
      );
    }
    if (this.options.allowedHostnames.length === 0) {
      throw new TurnstileVerificationError(
        "Turnstile allowed hostnames are not configured",
        "missing-hostnames",
      );
    }

    const form = new URLSearchParams({
      secret: this.options.secretKey,
      response: token,
      idempotency_key: randomUUID(),
    });

    const remoteIp = normalizeRemoteIp(input.remoteIp);
    if (remoteIp) {
      form.set("remoteip", remoteIp);
    }

    let response: Response;
    try {
      response = await fetch(this.siteverifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new TurnstileVerificationError(
        error instanceof Error
          ? error.message
          : "Turnstile siteverify request failed",
        "network-error",
      );
    }

    if (!response.ok) {
      throw new TurnstileVerificationError(
        `Turnstile siteverify failed: ${response.status}`,
        "siteverify-failed",
      );
    }

    const result = (await response.json()) as TurnstileSiteverifyResponse;
    if (!result.success) {
      throw new TurnstileVerificationError(
        `Turnstile verification failed: ${(result["error-codes"] ?? []).join(",") || "unknown"}`,
        "siteverify-failed",
      );
    }

    if (!isAllowedHostname(result.hostname, this.options.allowedHostnames)) {
      throw new TurnstileVerificationError(
        "Turnstile hostname is not allowed",
        "hostname-mismatch",
      );
    }

    if (input.expectedAction && result.action !== input.expectedAction) {
      throw new TurnstileVerificationError(
        "Turnstile action does not match",
        "action-mismatch",
      );
    }

    return result;
  }
}

function parseBoolean(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function parseHostnames(value: string | undefined): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((hostname) => normalizeHostname(hostname))
        .filter(Boolean),
    ),
  ];
}

function normalizeHostname(value: string | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "";

  try {
    return new URL(
      /^[a-z][a-z\d+\-.]*:\/\//.test(raw) ? raw : `http://${raw}`,
    ).hostname.replace(/\.$/, "");
  } catch {
    return raw.split("/")[0]?.replace(/\.$/, "") ?? "";
  }
}

function isAllowedHostname(
  hostname: string | undefined,
  allowedHostnames: string[],
): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;

  return allowedHostnames.some(
    (allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`),
  );
}

function normalizeRemoteIp(value: string | null | undefined): string | null {
  const first = value?.split(",")[0]?.trim();
  if (!first || first === "unknown") return null;
  return first;
}
