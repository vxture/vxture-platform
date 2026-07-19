/**
 * page.tsx - 注册入口别名（/register → 同 /signup，收编到 accounts）
 * @package @vxture/website
 *
 * See docs/design/identity-platform-implementation.md §3 (16b), D-BA.
 */

import { Suspense } from "react";
import { RpLoginRedirect } from "@/components/auth/RpLoginRedirect";

export default function RegisterAliasPage() {
  return (
    <Suspense>
      <RpLoginRedirect message="正在跳转到登录/注册…" />
    </Suspense>
  );
}
