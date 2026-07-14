/**
 * page.tsx - /operator/reset-password?token=… (set a new operator password)
 * @package @vxture/accounts
 *
 * Landing page for the admin-issued operator reset link. Reads the one-time
 * token and renders the new-password form; a missing token means the link was
 * malformed/opened out of band — show a friendly notice instead of a broken form.
 */
import { OperatorResetPasswordPanel } from "@/components/OperatorResetPasswordPanel";

export const dynamic = "force-dynamic";

export default async function OperatorResetPasswordPage({
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
        <p>请联系管理员重新生成重置链接。</p>
      </main>
    );
  }

  return <OperatorResetPasswordPanel token={token} />;
}
