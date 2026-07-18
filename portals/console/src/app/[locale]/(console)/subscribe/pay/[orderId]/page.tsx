import { Suspense } from "react";
import { OrderPayPage } from "@/modules/commerce/OrderPayPage";

export default function Page() {
  return (
    <Suspense>
      <OrderPayPage />
    </Suspense>
  );
}
