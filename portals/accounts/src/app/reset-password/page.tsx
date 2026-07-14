/**
 * page.tsx - /reset-password?token=… (set a new password)
 * @package @vxture/accounts
 *
 * Landing page for the emailed reset link. Reads the one-time token and renders
 * the new-password form; a missing token means the link was malformed/opened out
 * of band — show a friendly notice instead of a broken form.
 */
import { ResetPasswordPanel } from "@/components/ResetPasswordPanel";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return (
      <main className="vx-accounts-notice">
        <h1>重置链接无效</h1>
        <p>请重新发起密码重置。</p>
      </main>
    );
  }

  return <ResetPasswordPanel token={token} />;
}
