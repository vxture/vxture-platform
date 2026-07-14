/**
 * page.tsx - 案例详情页路由
 * @package @vxture/website
 * @layer Presentation
 * @category Pages - Cases
 * @author AI-Generated
 * @date 2026-05-06
 */

import CaseDetail from "@/components/cases/CaseDetail";

interface CaseDetailRouteProps {
  params: {
    slug: string;
  };
}

export default function CaseDetailRoutePage({ params }: CaseDetailRouteProps) {
  return <CaseDetail slug={params.slug} />;
}
