import { Suspense } from "react";
import { ProductSubscribePage } from "@/components/marketing";

/** /pricing 通用订阅页；useSearchParams 需要 Suspense 边界以支持静态预渲染。 */
export default function PricingPage() {
  return (
    <Suspense>
      <ProductSubscribePage />
    </Suspense>
  );
}
