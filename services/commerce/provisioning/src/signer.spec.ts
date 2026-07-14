import { describe, it, expect } from "vitest";
import {
  computeV1,
  signWebhook,
  parseSignatureHeader,
  safeEqualHex,
  verifyWebhook,
} from "./signer";
import { backoffSeconds } from "./backoff";

const SECRET = "whsec_test_0001";
const BODY = JSON.stringify({ id: "d1", type: "tenant.provisioned", seq: 3 });

describe("webhook signer", () => {
  it("computeV1 is deterministic and hex", () => {
    const a = computeV1(SECRET, BODY, 1718000000);
    const b = computeV1(SECRET, BODY, 1718000000);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("signature changes with timestamp, body, and secret", () => {
    const base = computeV1(SECRET, BODY, 1718000000);
    expect(computeV1(SECRET, BODY, 1718000001)).not.toBe(base);
    expect(computeV1(SECRET, BODY + " ", 1718000000)).not.toBe(base);
    expect(computeV1(SECRET + "x", BODY, 1718000000)).not.toBe(base);
  });

  it("signWebhook emits a t=,v1= header parseable back", () => {
    const { header, timestamp } = signWebhook(SECRET, BODY, 1718000000);
    const parsed = parseSignatureHeader(header);
    expect(parsed).not.toBeNull();
    expect(parsed!.t).toBe(timestamp);
    expect(parsed!.v1).toBe(computeV1(SECRET, BODY, timestamp));
  });

  it("parseSignatureHeader tolerates order/whitespace and rejects malformed", () => {
    expect(parseSignatureHeader("v1=abc, t=42")).toEqual({ t: 42, v1: "abc" });
    expect(parseSignatureHeader("t=42")).toBeNull();
    expect(parseSignatureHeader("garbage")).toBeNull();
  });

  it("safeEqualHex is true only for identical hex of equal length", () => {
    expect(safeEqualHex("deadbeef", "deadbeef")).toBe(true);
    expect(safeEqualHex("deadbeef", "deadbeee")).toBe(false);
    expect(safeEqualHex("dead", "deadbeef")).toBe(false);
  });
});

describe("verifyWebhook (reference receiver)", () => {
  const now = 1718000000;
  it("accepts a fresh, correctly-signed body", () => {
    const { header } = signWebhook(SECRET, BODY, now);
    expect(verifyWebhook(SECRET, BODY, header, now)).toBe(true);
  });
  it("rejects a wrong secret", () => {
    const { header } = signWebhook(SECRET, BODY, now);
    expect(verifyWebhook("other", BODY, header, now)).toBe(false);
  });
  it("rejects a tampered body", () => {
    const { header } = signWebhook(SECRET, BODY, now);
    expect(verifyWebhook(SECRET, BODY + "x", header, now)).toBe(false);
  });
  it("rejects outside the ±tolerance window (replay)", () => {
    const { header } = signWebhook(SECRET, BODY, now);
    expect(verifyWebhook(SECRET, BODY, header, now + 301)).toBe(false);
    expect(verifyWebhook(SECRET, BODY, header, now + 299)).toBe(true);
  });
});

describe("backoffSeconds", () => {
  it("is capped exponential from base", () => {
    expect(backoffSeconds(1, 30, 3600)).toBe(30);
    expect(backoffSeconds(2, 30, 3600)).toBe(60);
    expect(backoffSeconds(3, 30, 3600)).toBe(120);
    expect(backoffSeconds(8, 30, 3600)).toBe(3600); // 30*128=3840 → capped
    expect(backoffSeconds(50, 30, 3600)).toBe(3600); // no overflow
  });
  it("floors attempts at 1", () => {
    expect(backoffSeconds(0, 30, 3600)).toBe(30);
  });
});
