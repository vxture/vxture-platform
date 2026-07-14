/**
 * layout.tsx - (public) 全站公开页共享布局
 * @package @vxture/website
 * @layer Presentation
 * @category Layouts - Public
 * @author AI-Generated
 * @date 2026-05-06
 *
 * website 所有公开页面（marketing / content / docs / landing）的共同父布局。
 * Header 和 Footer 实例唯一，跨任何公开页导航均不重新挂载。
 * 仅 (auth) 路由组不继承此布局。
 */

import { Footer, Header } from "@/components/layout";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
