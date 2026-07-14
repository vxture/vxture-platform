import { describe, it, expect } from "vitest";
import { extractClientIp, type ClientIpRequest } from "./http.utils";

function req(
  headers: Record<string, string | string[] | undefined>,
  socket?: { remoteAddress?: string },
): ClientIpRequest {
  return { headers, ...(socket ? { socket } : {}) };
}

describe("extractClientIp", () => {
  it("returns X-Real-IP directly, ignoring everything else", () => {
    const result = extractClientIp(
      req(
        {
          "x-real-ip": "203.0.113.10",
          "cf-connecting-ip": "198.51.100.20",
          "x-forwarded-for": "9.9.9.9, 203.0.113.5",
        },
        { remoteAddress: "10.0.0.1" },
      ),
    );
    expect(result).toBe("203.0.113.10");
  });

  it("falls back to CF-Connecting-IP when X-Real-IP is absent", () => {
    const result = extractClientIp(
      req({
        "cf-connecting-ip": "198.51.100.20",
        "x-forwarded-for": "9.9.9.9, 203.0.113.5",
      }),
    );
    expect(result).toBe("198.51.100.20");
  });

  it("takes the LAST segment of X-Forwarded-For, not the first — defeats a forged leading segment", () => {
    // Simulates a client that pre-set its own X-Forwarded-For before hitting
    // Cloudflare/nginx; nginx's $proxy_add_x_forwarded_for APPENDS the real,
    // realip-corrected IP as the last segment rather than replacing the header.
    const result = extractClientIp(
      req({
        "x-forwarded-for": "9.9.9.9, 203.0.113.5",
      }),
    );
    expect(result).toBe("203.0.113.5");
    expect(result).not.toBe("9.9.9.9");
  });

  it("returns the single segment of X-Forwarded-For when there is no forged prefix", () => {
    const result = extractClientIp(
      req({
        "x-forwarded-for": "203.0.113.5",
      }),
    );
    expect(result).toBe("203.0.113.5");
  });

  it("trims whitespace around X-Forwarded-For segments", () => {
    const result = extractClientIp(
      req({
        "x-forwarded-for": "  9.9.9.9  ,   203.0.113.5  ",
      }),
    );
    expect(result).toBe("203.0.113.5");
  });

  it("falls back to socket.remoteAddress when no relevant headers are present", () => {
    const result = extractClientIp(req({}, { remoteAddress: "10.0.0.7" }));
    expect(result).toBe("10.0.0.7");
  });

  it("falls back to connection.remoteAddress when socket is absent", () => {
    const result = extractClientIp({
      headers: {},
      connection: { remoteAddress: "10.0.0.9" },
    });
    expect(result).toBe("10.0.0.9");
  });

  it('returns "unknown" when nothing usable is found', () => {
    const result = extractClientIp(req({}));
    expect(result).toBe("unknown");
  });

  it("uses the first element when a header value arrives as a string array", () => {
    const result = extractClientIp(
      req({
        "x-real-ip": ["203.0.113.10", "203.0.113.11"],
      }),
    );
    expect(result).toBe("203.0.113.10");
  });

  it("does not crash on an array X-Forwarded-For header and uses the last segment of the first element", () => {
    const result = extractClientIp(
      req({
        "x-forwarded-for": ["9.9.9.9, 203.0.113.5", "ignored second entry"],
      }),
    );
    expect(result).toBe("203.0.113.5");
  });
});
