/**
 * ResetPasswordPanel.tsx - set a new password from a reset-link token
 * @package @vxture/accounts
 *
 * Reached via the emailed link (/reset-password?token=…). Collects + confirms a
 * new password and posts it with the token to the IdP. On success the password
 * is re-hashed (Argon2id) and the token is single-use-consumed.
 * See docs/design/identity-platform-implementation.md §3 (16c), D-BE=A.
 */
"use client";

import { useState, type FormEvent } from "react";
import {
  AuthChromeFooter,
  AuthChromeHeader,
  AuthField,
  AuthLoginTemplate,
  AuthPrimaryButton,
} from "@vxture/design-system";
import { resetPassword } from "@/api/oidc";

export function ResetPasswordPanel({ token }: { readonly token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败，请稍后重试");
      setLoading(false);
    }
  };

  return (
    <AuthLoginTemplate
      header={<AuthChromeHeader brandLabel="Vxture" />}
      footer={<AuthChromeFooter />}
      title="设置新密码"
      useLoginLayout
    >
      {done ? (
        <div className="vx-auth-reset-done">
          <div className="vx-auth-check">✓</div>
          <h1>密码已重置</h1>
          <p>请返回应用使用新密码登录。</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} autoComplete="on">
          <AuthField
            label="新密码"
            name="new-password"
            type="password"
            placeholder="至少 8 位"
            icon="lock"
            value={password}
            autoComplete="new-password"
            autoFocus
            disabled={loading}
            onChange={setPassword}
          />
          <AuthField
            label="确认新密码"
            name="confirm-password"
            type="password"
            placeholder="再次输入新密码"
            icon="lock"
            value={confirm}
            error={error}
            autoComplete="new-password"
            disabled={loading}
            onChange={setConfirm}
          />
          <AuthPrimaryButton
            loading={loading}
            label="重置密码"
            loadingLabel="重置中..."
          />
        </form>
      )}
    </AuthLoginTemplate>
  );
}
