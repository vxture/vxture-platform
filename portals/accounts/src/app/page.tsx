/**
 * page.tsx - accounts root (placeholder)
 * @package @vxture/accounts
 *
 * v1 ships only /login. The account center (profile / security / connected
 * apps / sessions) lands later. See docs/design/identity-platform-idp.md §7.
 */
export default function HomePage() {
  return (
    <main className="vx-accounts-notice">
      <h1>Vxture 账号中心</h1>
      <p>请通过应用登录入口访问。</p>
    </main>
  );
}
