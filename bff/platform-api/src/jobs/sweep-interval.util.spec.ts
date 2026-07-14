import { describe, expect, it } from "vitest";
import { sweepIntervalMs } from "./sweep-interval.util";

describe("sweepIntervalMs", () => {
  it("defaults to 60s and enforces a 5s floor", () => {
    expect(sweepIntervalMs(undefined)).toBe(60_000);
    expect(sweepIntervalMs("abc")).toBe(60_000);
    expect(sweepIntervalMs("1000")).toBe(60_000);
    expect(sweepIntervalMs("30000")).toBe(30_000);
  });
});
