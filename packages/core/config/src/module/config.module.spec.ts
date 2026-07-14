import { describe, expect, it } from "vitest";
import { z } from "zod";

import { stripEmptyEnvValues } from "./config.module";

describe("stripEmptyEnvValues", () => {
  it("removes empty-string values (treats `KEY=` as unset)", () => {
    expect(stripEmptyEnvValues({ A: "", B: "x" })).toEqual({ B: "x" });
  });

  it("keeps non-empty values verbatim, including falsy-looking strings", () => {
    expect(stripEmptyEnvValues({ A: "v", B: "0", C: "false", D: " " })).toEqual(
      {
        A: "v",
        B: "0",
        C: "false",
        D: " ",
      },
    );
  });

  it("lets an optional+constrained key accept an empty env value (boot-crash regression)", () => {
    // OPERATOR_TOTP_ENC_KEY shape. The raw "" took down prod auth-bff at boot:
    // .optional() does not short-circuit "" so .min(32) ran and threw.
    const schema = z.object({ K: z.string().min(32).optional() });

    expect(() => schema.parse({ K: "" })).toThrow();
    expect(schema.parse(stripEmptyEnvValues({ K: "" }))).toEqual({});
  });

  it("lets .default() apply when the env value is empty", () => {
    const schema = z.object({ K: z.string().default("fallback") });

    expect(schema.parse(stripEmptyEnvValues({ K: "" }))).toEqual({
      K: "fallback",
    });
  });

  it("still surfaces a missing REQUIRED key as a validation error", () => {
    const schema = z.object({ K: z.string().min(1) });

    expect(() => schema.parse(stripEmptyEnvValues({ K: "" }))).toThrow();
  });
});
