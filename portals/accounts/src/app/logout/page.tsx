/**
 * page.tsx - /logout (unified post-logout surface, D-AU)
 * @package @vxture/accounts
 *
 * The IdP end_session redirects here after single-logout, as
 * /logout?client=<id>&mode=signout|switch&relogin=<rp-login-entry>&state=….
 * Reads the initiating client + intent and routes the user onward via PostLogout
 * (origin-based home vs. re-login). See docs/design/identity-platform-access-topology.md §5.
 */
import { PostLogout } from "@/components/PostLogout";

export const dynamic = "force-dynamic";

export default async function LogoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const clientId = typeof params.client === "string" ? params.client : "";
  const mode = params.mode === "switch" ? "switch" : "signout";
  const relogin = typeof params.relogin === "string" ? params.relogin : null;
  return <PostLogout clientId={clientId} mode={mode} relogin={relogin} />;
}
