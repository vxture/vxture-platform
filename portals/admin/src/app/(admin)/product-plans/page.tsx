import { redirect } from "next/navigation";

export default function Page() {
  // Legacy admin route kept as a stable redirect after the menu moved to /service-plans.
  redirect("/service-plans");
}
