import { generateKeyPairSync } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import { describe, it, expect } from "vitest";
import { OidcKeyService } from "./oidc-key.service";

// Minimal fake of the auth config domain consumed by OidcKeyService.
type AuthCfg = {
  OIDC_ALGORITHM: "RS256" | "ES256";
  OIDC_ISSUER: string;
  OIDC_ACTIVE_KID?: string;
  OIDC_SIGNING_PRIVATE_KEY?: string;
};

function makeService(auth: AuthCfg): OidcKeyService {
  const config = { auth } as unknown as ConstructorParameters<
    typeof OidcKeyService
  >[0];
  return new OidcKeyService(config, new JwtService({}));
}

function rsaPrivatePem(): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return privateKey;
}

const ISSUER = "https://auth.test.local";

describe("OidcKeyService", () => {
  it("loads a PEM key, is ready, and publishes one JWKS key with the kid", () => {
    const svc = makeService({
      OIDC_ALGORITHM: "RS256",
      OIDC_ISSUER: ISSUER,
      OIDC_ACTIVE_KID: "kid-1",
      OIDC_SIGNING_PRIVATE_KEY: rsaPrivatePem(),
    });
    expect(svc.isReady()).toBe(true);
    const jwks = svc.getJwks();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({
      kid: "kid-1",
      use: "sig",
      alg: "RS256",
      kty: "RSA",
    });
  });

  it("signs and self-verifies a token round-trip (iss/aud/sub/kid)", () => {
    const svc = makeService({
      OIDC_ALGORITHM: "RS256",
      OIDC_ISSUER: ISSUER,
      OIDC_ACTIVE_KID: "kid-rt",
      OIDC_SIGNING_PRIVATE_KEY: rsaPrivatePem(),
    });
    const token = svc.sign(
      { custom: "x" },
      { audience: "console", subject: "usr_1", expiresInSec: 300 },
    );
    // header carries the kid
    const header = JSON.parse(
      Buffer.from(token.split(".")[0]!, "base64url").toString("utf8"),
    );
    expect(header).toMatchObject({ alg: "RS256", kid: "kid-rt" });

    const claims = svc.verify(token);
    expect(claims).toMatchObject({
      iss: ISSUER,
      aud: "console",
      sub: "usr_1",
      custom: "x",
    });
    expect(typeof claims.jti).toBe("string");
  });

  it("accepts a base64-encoded private key (line-based env loaders)", () => {
    const pem = rsaPrivatePem();
    const b64 = Buffer.from(pem, "utf8").toString("base64");
    const svc = makeService({
      OIDC_ALGORITHM: "RS256",
      OIDC_ISSUER: ISSUER,
      OIDC_ACTIVE_KID: "kid-b64",
      OIDC_SIGNING_PRIVATE_KEY: b64,
    });
    expect(svc.isReady()).toBe(true);
    expect(svc.getJwks().keys[0]?.kid).toBe("kid-b64");
  });

  it("rejects a token signed under a different key", () => {
    const a = makeService({
      OIDC_ALGORITHM: "RS256",
      OIDC_ISSUER: ISSUER,
      OIDC_ACTIVE_KID: "a",
      OIDC_SIGNING_PRIVATE_KEY: rsaPrivatePem(),
    });
    const b = makeService({
      OIDC_ALGORITHM: "RS256",
      OIDC_ISSUER: ISSUER,
      OIDC_ACTIVE_KID: "b",
      OIDC_SIGNING_PRIVATE_KEY: rsaPrivatePem(),
    });
    const token = a.sign(
      {},
      { audience: "console", subject: "usr_1", expiresInSec: 300 },
    );
    expect(() => b.verify(token)).toThrow();
  });

  it("signs a token with no sub claim when subject is omitted (T1 service-mode)", () => {
    const svc = makeService({
      OIDC_ALGORITHM: "RS256",
      OIDC_ISSUER: ISSUER,
      OIDC_ACTIVE_KID: "kid-nosub",
      OIDC_SIGNING_PRIVATE_KEY: rsaPrivatePem(),
    });
    const token = svc.sign(
      { act: { sub: "arda" } },
      { audience: "karda", expiresInSec: 300 },
    );
    const claims = svc.verify(token);
    expect(claims).toMatchObject({ iss: ISSUER, aud: "karda" });
    expect(claims.sub).toBeUndefined();
  });

  it("stays inert when no signing key is configured (legacy path unaffected)", () => {
    const svc = makeService({ OIDC_ALGORITHM: "RS256", OIDC_ISSUER: ISSUER });
    expect(svc.isReady()).toBe(false);
    expect(svc.getJwks().keys).toHaveLength(0);
    expect(() =>
      svc.sign({}, { audience: "x", subject: "y", expiresInSec: 1 }),
    ).toThrow();
  });
});
