/**
 * page.tsx - /bind-phone?binding_token=… (bind a phone to a social login)
 * @package @vxture/accounts
 *
 * Landing page after a social login whose upstream returned no phone. Reads the
 * one-time binding token and renders the phone-binding form; a missing token
 * means the page was opened out of band — show a friendly notice.
 */
import { BindPhonePanel } from "@/components/BindPhonePanel";

export const dynamic = "force-dynamic";

export default async function BindPhonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token =
    typeof params.binding_token === "string" ? params.binding_token : "";

  if (!token) {
    return (
      <main className="vx-accounts-notice">
        <h1>绑定会话无效</h1>
        <p>请重新发起登录。</p>
      </main>
    );
  }

  return <BindPhonePanel token={token} />;
}
