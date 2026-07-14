/**
 * page.tsx - First-login nickname page
 * @package @vxture/website
 * @layer Presentation
 * @category Pages
 *
 * Renders SetNicknameForm, which reads the returnTo target from the query
 * string and lets the user set (or skip) a nickname after first login.
 */

"use client";

import { SetNicknameForm } from "@/components/auth/SetNicknameForm";

export default function SetNicknamePage() {
  return <SetNicknameForm />;
}
