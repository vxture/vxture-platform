/**
 * page.tsx - /forgot-password (request an email reset link)
 * @package @vxture/accounts
 *
 * Standalone reset-request surface on the central accounts page. Off the OIDC
 * login_challenge: the user lands here from the login form's "忘记密码？" link,
 * submits their email, and the IdP mails a one-time reset link. The IdP always
 * responds 200 (anti-enumeration), so the UI shows the same "sent" state.
 * See docs/design/identity-platform-implementation.md §3 (16c), D-BE=A.
 */
"use client";

import { useState, type FormEvent } from "react";
import {
  AuthChromeFooter,
  AuthChromeHeader,
  AuthForgotPasswordPanel,
  AuthLoginTemplate,
} from "@vxture/design-system";
import { requestPasswordReset } from "@/api/oidc";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLoginTemplate
      header={<AuthChromeHeader brandLabel="Vxture" />}
      footer={<AuthChromeFooter />}
      title="重置密码"
      useLoginLayout
    >
      <AuthForgotPasswordPanel
        email={email}
        error={error}
        loading={loading}
        resetSent={resetSent}
        onBack={() => window.history.back()}
        onChangeEmail={setEmail}
        onSubmit={onSubmit}
      />
    </AuthLoginTemplate>
  );
}
