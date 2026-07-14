import { describe, it, expect, vi, afterEach } from "vitest";
import { GoogleProvider } from "./google.provider";

const provider = new GoogleProvider("client-123", "secret-xyz");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GoogleProvider.buildAuthorizationUrl", () => {
  it("targets Google's auth endpoint with code+openid scope+state", () => {
    const url = new URL(
      provider.buildAuthorizationUrl(
        "https://auth.vxture.com/auth-api/auth/oauth/google/callback",
        "state-abc",
      ),
    );
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("state-abc");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://auth.vxture.com/auth-api/auth/oauth/google/callback",
    );
  });
});

describe("GoogleProvider.getUserInfo", () => {
  it("maps sub→providerId, picture→avatar, and NEVER yields a phone (B3)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          sub: "google-sub-999",
          email: "u@example.com",
          email_verified: true,
          name: "Jane",
          picture: "https://img/x.png",
        }),
      })),
    );
    const profile = await provider.getUserInfo("at-1");
    expect(profile.provider).toBe("google");
    expect(profile.providerId).toBe("google-sub-999");
    expect(profile.email).toBe("u@example.com");
    expect(profile.name).toBe("Jane");
    expect(profile.avatar).toBe("https://img/x.png");
    expect(profile.phone).toBeUndefined(); // Google never returns phone
  });

  it("falls back name → email → sub when name absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ sub: "s-1", email: "e@x.com" }),
      })),
    );
    const profile = await provider.getUserInfo("at-2");
    expect(profile.name).toBe("e@x.com");
    expect(profile.phone).toBeUndefined();
  });

  it("throws on a non-ok userinfo response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => "unauthorized",
      })),
    );
    await expect(provider.getUserInfo("bad")).rejects.toThrow(
      /Google userinfo/,
    );
  });
});
