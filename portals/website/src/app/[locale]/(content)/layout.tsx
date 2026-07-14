/**
 * layout.tsx - Content 路由组布局
 * @package @vxture/website
 * @layer Presentation
 * @category Layouts - Content
 * @author AI-Generated
 * @date 2026-05-06
 */

import { Footer, Header } from "@/components/layout";

export default function ContentLayout({
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
