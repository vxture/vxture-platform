import { describe, it, expect } from "vitest";
import { authMethodToAmr } from "./amr";

describe("authMethodToAmr", () => {
  it("maps a single password factor", () => {
    expect(authMethodToAmr("password")).toEqual(["pwd"]);
  });

  it("maps password + TOTP to pwd/otp/mfa", () => {
    expect(authMethodToAmr("password+totp")).toEqual(["pwd", "otp", "mfa"]);
  });

  it("maps password + recovery to pwd/rc/mfa", () => {
    expect(authMethodToAmr("password+recovery")).toEqual(["pwd", "rc", "mfa"]);
  });

  it("maps password + webauthn to pwd/hwk/mfa", () => {
    expect(authMethodToAmr("password+webauthn")).toEqual(["pwd", "hwk", "mfa"]);
  });

  it("maps email/phone OTP first factors to otp", () => {
    expect(authMethodToAmr("email_otp")).toEqual(["otp"]);
    expect(authMethodToAmr("phone_otp+totp")).toEqual(["otp", "mfa"]);
  });

  it("dedupes and tolerates spacing/empties", () => {
    expect(authMethodToAmr(" password + totp ")).toEqual(["pwd", "otp", "mfa"]);
    expect(authMethodToAmr("")).toEqual([]);
  });
});
