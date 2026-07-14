/**
 * SetNicknameForm.tsx - First-login info-supplement page
 * @package @vxture/website
 * @layer Presentation
 * @category Auth
 *
 * Shown right after a new account is created on ANY entry point (password
 * signup / phone-code login / OAuth direct / OAuth bind, when isNewAccount).
 * Pre-fills from the account (GET /api/me/profile) and lets the user complete
 * the necessary info, so a first login never leaves the profile incomplete.
 * Display name and email are editable; username and phone (the verified
 * identity anchor) are shown read-only. Skippable; redirects to returnTo.
 */

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AuthFooter, AuthHeader } from "@/components/auth/AuthChrome";
import { Button, Input } from "@vxture/design-system";
import { useNotificationStore } from "@/stores/notification.store";
import { useRouter } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { getUserProfile, updateUserProfile } from "@/api/auth.api";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Mask a phone (E.164 or national) for read-only display, keeping head/tail. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface SetNicknameFormProps {
  className?: string;
}

export function SetNicknameForm({ className = "" }: SetNicknameFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [prefilling, setPrefilling] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const { addNotification } = useNotificationStore();

  // Pre-fill from the current account (works for OAuth direct redirect too,
  // since the callback has already set the session cookies).
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const profile = await getUserProfile();
        if (!active) return;
        setDisplayName(profile.displayName ?? profile.username ?? "");
        setUsername(profile.username ?? "");
        setPhone(profile.phone ?? "");
        setEmail(profile.email ?? "");
      } catch {
        // Non-fatal: the page still works as a blank supplement form.
      } finally {
        if (active) setPrefilling(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const goToReturnTo = () => {
    router.push(returnTo as "/");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const nextDisplayName = displayName.trim();
    const nextEmail = email.trim();
    const nextUsername = username.trim();
    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("请输入有效的邮箱");
      return;
    }
    if (nextUsername && !/^[a-zA-Z0-9_.-]{3,32}$/.test(nextUsername)) {
      setError("用户名为 3-32 位字母、数字、_.-");
      return;
    }

    setError(undefined);
    setLoading(true);
    try {
      await updateUserProfile({
        ...(nextUsername ? { username: nextUsername } : {}),
        ...(nextDisplayName ? { displayName: nextDisplayName } : {}),
        ...(nextEmail ? { email: nextEmail } : {}),
      });
      addNotification("信息已完善", "success");
      goToReturnTo();
    } catch (err) {
      addNotification(
        err instanceof Error ? err.message : "保存失败，请稍后重试",
        "error",
      );
      setLoading(false);
    }
  };

  const handleSkip = () => {
    goToReturnTo();
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <section
      className={`vx-auth-page vx-auth-page--default-bg vx-signup-page ${className}`}
    >
      <AuthHeader />

      <main className="vx-signup-main">
        <div className="vx-signup-card" aria-label="complete profile">
          <div className="vx-auth-panel-heading vx-signup-heading">
            <h1>完善信息</h1>
            <p>确认并补全你的资料，方便他人认识你（可稍后再设置）</p>
          </div>

          <form onSubmit={handleSubmit} className="vx-signup-form" noValidate>
            <div className="vx-signup-field">
              <label>显示名</label>
              <Input
                name="displayName"
                type="text"
                value={displayName}
                placeholder="请输入显示名 / 昵称"
                autoComplete="nickname"
                autoFocus
                disabled={loading || prefilling}
                onChange={(event) => setDisplayName(event.target.value)}
                aria-invalid={Boolean(error)}
              />
            </div>

            <div className="vx-signup-field">
              <label>账号 / 用户名</label>
              <Input
                name="username"
                type="text"
                value={username}
                placeholder="请输入用户名"
                autoComplete="username"
                disabled={loading || prefilling}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className="vx-signup-field">
              <label>邮箱</label>
              <Input
                name="email"
                type="email"
                value={email}
                placeholder="请输入邮箱"
                autoComplete="email"
                disabled={loading || prefilling}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {phone ? (
              <div className="vx-signup-field">
                <label>手机号</label>
                <Input
                  name="phone"
                  type="text"
                  value={maskPhone(phone)}
                  disabled
                />
              </div>
            ) : null}

            {error ? <p>{error}</p> : null}

            <Button
              type="submit"
              className="vx-auth-primary vx-signup-primary"
              disabled={loading || prefilling}
            >
              {loading ? (
                <>
                  <span className="vx-auth-spinner" />
                  保存中...
                </>
              ) : (
                "保存并继续"
              )}
            </Button>
          </form>

          <Button
            variant="ghost"
            className="vx-verify-skip"
            disabled={loading}
            onClick={handleSkip}
          >
            跳过，稍后再设置
          </Button>
        </div>
      </main>

      <AuthFooter />
    </section>
  );
}
