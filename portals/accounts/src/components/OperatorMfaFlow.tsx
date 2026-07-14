/**
 * OperatorMfaFlow.tsx - operator second-factor continuation (Step2 + enroll).
 * @package @vxture/accounts
 *
 * Rendered after an operator's first factor succeeds and the IdP returns
 * `mfa_required` (identity-platform-operator.md §3.2). Three sub-steps, reusing
 * the design-system auth primitives (no design-system changes):
 *   - verify   — enter a TOTP code (or a recovery code) → /mfa/verify.
 *   - enroll   — enroll-on-login: scan the QR + confirm the first code →
 *                /mfa/enroll/totp(/confirm); on success surfaces recovery codes.
 *   - recovery — show the one-time recovery codes, then continue to the app.
 * On completion the browser navigates to the RP redirect (authorization code).
 */
"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AuthChromeFooter,
  AuthChromeHeader,
  AuthField,
  AuthFlowForm,
  AuthLoginTemplate,
  AuthPrimaryButton,
} from "@vxture/design-system";
import {
  beginOperatorTotpEnroll,
  confirmOperatorTotpEnroll,
  verifyOperatorMfa,
} from "@/api/oidc";
import {
  authenticateOperatorPasskey,
  enrollOperatorPasskeyOnLogin,
} from "@/api/operator-webauthn";
import { TotpQrCode } from "./TotpQrCode";

interface OperatorMfaFlowProps {
  readonly mfaToken: string;
  readonly methods: string[];
  readonly enrollRequired: boolean;
  readonly enrollFactor: "totp" | "webauthn" | null;
}

type Phase = "verify" | "enroll" | "recovery";

export function OperatorMfaFlow({
  mfaToken,
  methods,
  enrollRequired,
  enrollFactor,
}: OperatorMfaFlowProps) {
  const enrollWebauthn = enrollRequired && enrollFactor === "webauthn";
  const [phase, setPhase] = useState<Phase>(
    enrollRequired ? "enroll" : "verify",
  );
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Enroll material (fetched on entering the enroll phase).
  const [secret, setSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");

  // Recovery codes surfaced once after enrollment.
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [redirectTo, setRedirectTo] = useState("");

  // On entering the TOTP enroll phase, stage a secret + fetch the QR material.
  // The webauthn enroll branch is button-driven (no pre-fetch).
  useEffect(() => {
    if (phase !== "enroll" || enrollWebauthn || otpauthUri) return;
    let active = true;
    beginOperatorTotpEnroll(mfaToken)
      .then((m) => {
        if (!active) return;
        setSecret(m.secret);
        setOtpauthUri(m.otpauthUri);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "注册初始化失败");
      });
    return () => {
      active = false;
    };
  }, [phase, otpauthUri, mfaToken, enrollWebauthn]);

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    const method = useRecovery ? "recovery" : "totp";
    if (!code.trim()) {
      setError(useRecovery ? "请输入恢复码" : "请输入 6 位验证码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { redirectTo: to } = await verifyOperatorMfa(
        mfaToken,
        method,
        code.trim(),
      );
      window.location.assign(to);
    } catch (e) {
      setError(e instanceof Error ? e.message : "验证失败，请重试");
      setLoading(false);
    }
  };

  const handleConfirmEnroll = async (event: FormEvent) => {
    event.preventDefault();
    if (code.trim().length !== 6) {
      setError("请输入验证器中的 6 位验证码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await confirmOperatorTotpEnroll(mfaToken, code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setRedirectTo(result.redirectTo);
      setCode("");
      setPhase("recovery");
    } catch (e) {
      setError(e instanceof Error ? e.message : "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskey = async () => {
    setLoading(true);
    setError("");
    try {
      const { redirectTo } = await authenticateOperatorPasskey(mfaToken);
      window.location.assign(redirectTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "通行密钥验证失败，请重试");
      setLoading(false);
    }
  };

  const handleEnrollPasskey = async () => {
    setLoading(true);
    setError("");
    try {
      const { redirectTo } = await enrollOperatorPasskeyOnLogin(mfaToken);
      window.location.assign(redirectTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "通行密钥注册失败，请重试");
      setLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    void navigator.clipboard
      ?.writeText(recoveryCodes.join("\n"))
      .catch(() => {});
  };

  // ── verify ────────────────────────────────────────────────────────────────
  if (phase === "verify") {
    return (
      <Shell title="二次验证">
        <AuthFlowForm
          onSubmit={handleVerify}
          input={
            <>
              <AuthField
                label={useRecovery ? "恢复码" : "验证码"}
                name="mfa_code"
                type="text"
                autoFocus
                placeholder={
                  useRecovery ? "请输入恢复码" : "请输入验证器 6 位验证码"
                }
                value={code}
                error={error}
                hint={
                  useRecovery
                    ? "使用注册时保存的一次性恢复码"
                    : "打开验证器 App（如 Google Authenticator）查看"
                }
                onChange={setCode}
              />
              <button
                type="button"
                className="vx-auth-link-button"
                onClick={() => {
                  setUseRecovery((v) => !v);
                  setCode("");
                  setError("");
                }}
              >
                {useRecovery ? "改用验证器验证码" : "使用恢复码"}
              </button>
              {methods.includes("webauthn") ? (
                <button
                  type="button"
                  className="vx-auth-link-button"
                  disabled={loading}
                  onClick={() => void handlePasskey()}
                >
                  使用通行密钥（Passkey）
                </button>
              ) : null}
            </>
          }
          primary={
            <AuthPrimaryButton
              loading={loading}
              label="验证并登录"
              loadingLabel="验证中…"
            />
          }
        />
      </Shell>
    );
  }

  // ── enroll: WebAuthn (high-privilege bootstrap) ─────────────────────────--
  if (phase === "enroll" && enrollWebauthn) {
    return (
      <Shell title="设置通行密钥">
        <p className="vx-auth-hint">
          运营账号要求使用通行密钥（Passkey）作为二次验证。请点击下方按钮，使用
          Windows Hello / Touch ID / 安全密钥完成注册后即可登录。
        </p>
        {error ? <p className="vx-auth-hint">{error}</p> : null}
        <button
          type="button"
          className="vx-auth-primary"
          disabled={loading}
          onClick={() => void handleEnrollPasskey()}
        >
          {loading ? "注册中…" : "注册通行密钥并登录"}
        </button>
      </Shell>
    );
  }

  // ── enroll: TOTP ────────────────────────────────────────────────────────--
  if (phase === "enroll") {
    return (
      <Shell title="设置二次验证">
        <p className="vx-auth-hint">
          为保护运营账号，请使用验证器 App
          扫描下方二维码，或手动输入密钥，然后输入生成的 6 位验证码完成绑定。
        </p>
        {otpauthUri ? <TotpQrCode value={otpauthUri} /> : null}
        {secret ? (
          <p className="vx-auth-hint" style={{ wordBreak: "break-all" }}>
            手动输入密钥：<code>{secret}</code>
          </p>
        ) : null}
        <AuthFlowForm
          onSubmit={handleConfirmEnroll}
          input={
            <AuthField
              label="验证码"
              name="totp_code"
              type="text"
              autoFocus
              placeholder="请输入验证器 6 位验证码"
              value={code}
              error={error}
              onChange={setCode}
            />
          }
          primary={
            <AuthPrimaryButton
              loading={loading}
              label="确认绑定并登录"
              loadingLabel="绑定中…"
              disabled={!otpauthUri}
            />
          }
        />
      </Shell>
    );
  }

  // ── recovery ────────────────────────────────────────────────────────────--
  return (
    <Shell title="保存恢复码">
      <p className="vx-auth-hint">
        以下恢复码仅显示一次，请妥善保存。当无法使用验证器时，可用一条恢复码登录（每条仅可使用一次）。
      </p>
      <ul className="vx-operator-recovery-codes">
        {recoveryCodes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="vx-auth-link-button"
        onClick={copyRecoveryCodes}
      >
        复制全部
      </button>
      <button
        type="button"
        className="vx-auth-primary"
        onClick={() => window.location.assign(redirectTo)}
      >
        我已保存，继续登录
      </button>
    </Shell>
  );
}

/** Shared chrome for the MFA steps (same template as the login form). */
function Shell({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <AuthLoginTemplate
      header={<AuthChromeHeader brandLabel="Vxture" />}
      footer={<AuthChromeFooter />}
      title={title}
      useLoginLayout
    >
      {children}
    </AuthLoginTemplate>
  );
}
