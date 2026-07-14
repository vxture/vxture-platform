import { describe, it, expect } from "vitest";
import { detectLoginAnomalies } from "./login-anomaly";

const history = {
  knownIps: ["1.1.1.1", "2.2.2.2"],
  knownUserAgents: ["Mozilla/5.0 Chrome"],
};

describe("detectLoginAnomalies", () => {
  it("first-ever login (no history) is never anomalous", () => {
    expect(
      detectLoginAnomalies(
        { knownIps: [], knownUserAgents: [] },
        { ip: "9.9.9.9", userAgent: "anything" },
      ),
    ).toEqual([]);
  });

  it("known ip + known device → no anomaly", () => {
    expect(
      detectLoginAnomalies(history, {
        ip: "1.1.1.1",
        userAgent: "Mozilla/5.0 Chrome",
      }),
    ).toEqual([]);
  });

  it("new ip → new_ip", () => {
    expect(
      detectLoginAnomalies(history, {
        ip: "9.9.9.9",
        userAgent: "Mozilla/5.0 Chrome",
      }),
    ).toEqual(["new_ip"]);
  });

  it("new user-agent → new_device", () => {
    expect(
      detectLoginAnomalies(history, { ip: "1.1.1.1", userAgent: "curl/8" }),
    ).toEqual(["new_device"]);
  });

  it("new ip + new device → both", () => {
    expect(
      detectLoginAnomalies(history, { ip: "9.9.9.9", userAgent: "curl/8" }),
    ).toEqual(["new_ip", "new_device"]);
  });

  it("ignores an unknown/empty ip", () => {
    expect(
      detectLoginAnomalies(history, {
        ip: "unknown",
        userAgent: "Mozilla/5.0 Chrome",
      }),
    ).toEqual([]);
  });
});
