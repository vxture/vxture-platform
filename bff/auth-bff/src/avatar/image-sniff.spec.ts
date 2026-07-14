import { describe, it, expect } from "vitest";
import { sniffImageType } from "@vxture/service-account";

const pad = (head: number[]): Buffer =>
  Buffer.concat([Buffer.from(head), Buffer.alloc(16)]);

describe("sniffImageType (shared, @vxture/service-account)", () => {
  it("detects PNG", () => {
    expect(
      sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
  });

  it("detects JPEG", () => {
    expect(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("detects WEBP", () => {
    expect(sniffImageType(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "ascii"))).toBe(
      "image/webp",
    );
  });

  it("detects GIF", () => {
    expect(sniffImageType(Buffer.from("GIF89a\0\0\0\0\0\0", "ascii"))).toBe(
      "image/gif",
    );
  });

  it("rejects SVG / text (no magic) — stored-XSS guard", () => {
    expect(
      sniffImageType(Buffer.from("<svg xmlns=...></svg>", "utf8")),
    ).toBeNull();
  });

  it("rejects too-short / empty input", () => {
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
    expect(sniffImageType(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});
