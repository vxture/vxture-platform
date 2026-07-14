/**
 * page.tsx - /login (OIDC interactive login)
 * @package @vxture/accounts
 *
 * The IdP redirects unauthenticated /authorize here as
 * /login?login_challenge=…&realm=customer|workforce. Reads those, then renders the
 * realm-driven login form. A missing login_challenge means the page was opened
 * out of band — show a friendly notice instead of a broken form.
 */
import { OidcLoginForm } from "@/components/OidcLoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const loginChallenge =
    typeof params.login_challenge === "string" ? params.login_challenge : "";
  const realm = params.realm === "workforce" ? "workforce" : "customer";

  if (!loginChallenge) {
    return (
      <main className="vx-accounts-notice">
        <h1>登录会话无效</h1>
        <p>请从应用重新发起登录。</p>
      </main>
    );
  }

  return <OidcLoginForm loginChallenge={loginChallenge} realm={realm} />;
}
