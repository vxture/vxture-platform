import { Suspense } from "react";
import { SubscribePage } from "@/modules/commerce/SubscribePage";

export default function Page() {
  return (
    <Suspense>
      <SubscribePage />
    </Suspense>
  );
}
