/**
 * page.tsx - 注册入口
 * @package @vxture/website
 * @layer Presentation
 * @category Pages
 *
 * Registration is consolidated onto the central accounts surface: the phone-code
 * login flow is "login-is-registration" (a new phone auto-creates the account +
 * a personal org, identity-platform-architecture.md §2), so website renders no signup form.
 * This entry redirects to the same RP login endpoint as signin.
 * See docs/design/identity-platform-implementation.md §3 (16b), D-BA.
 */

import { Suspense } from "react";
import { RpLoginRedirect } from "@/components/auth/RpLoginRedirect";

export default function SignupPage() {
  return (
    <Suspense>
      <RpLoginRedirect message="正在跳转到登录/注册…" />
    </Suspense>
  );
}
