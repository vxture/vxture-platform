/**
 * page.tsx - 登录入口别名（/login → 同 /signin，收编到 accounts）
 * @package @vxture/website
 *
 * Mirrors /signin: the login surface is centralized at the accounts IdP, so this
 * alias renders no form and redirects to the RP login endpoint.
 * See docs/design/identity-platform-implementation.md §3 (16b).
 */

import { Suspense } from "react";
import { RpLoginRedirect } from "@/components/auth/RpLoginRedirect";

export default function LoginAliasPage() {
  return (
    <Suspense>
      <RpLoginRedirect message="正在跳转到登录…" />
    </Suspense>
  );
}
