/**
 * layout.tsx - (marketing) 路由组透传布局
 * @package @vxture/website
 * @layer Presentation
 * @category Layouts - Marketing
 * @author AI-Generated
 * @date 2026-05-06
 *
 * Header / Footer 由父级 (public)/layout.tsx 统一提供，此处仅做透传。
 * 注意：此文件生效的前提是 (marketing) 目录已移入 (public)/ 下。
 * 若目录尚未移动，请保留 Header+Footer 此处临时充当共享层。
 */

import { Footer, Header } from "@/components/layout";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: 目录移入 (public)/ 后，删除 Header/Footer，改为 return <>{children}</>;
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
