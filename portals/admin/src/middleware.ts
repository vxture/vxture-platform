/**
 * middleware.ts — 认证决策前移到渲染之前（SSO Presence 三态机）。
 *
 * 这一层的存在意义是：**HTML 发出去之前身份状态就已经定了**。
 * 在此之前决策发生在客户端 —— 页面先整屏渲染、水合、发一次会话请求、拿到
 * 401、再 `location.replace` 跳走。每一次这样的往返都是一次完整的页面加载 +
 * 一次绘制，冷启动要走 9 跳 3 次绘制（2026-08-04 实测），用户看到的就是
 * "闪好几下才进登录页"。跳转次数只是表象，根因是**决策发生得太晚**。
 *
 *   Browser
 *      │
 *      ▼
 *   middleware（本文件，零网络调用，只读 cookie）
 *      ├── Authenticated  RP 会话 cookie 在        → 放行，直接渲染业务系统
 *      ├── Anonymous      presence=anonymous      → 直接交互登录（不再静默探测）
 *      └── Unknown        两个都没有              → 静默探测一次（prompt=none）
 *                                                    成功 → 建会话；失败 → BFF 标 Anonymous
 *
 * **刻意不做会话有效性校验。** middleware 只看 cookie 在不在，不去问 BFF"这个
 * 会话还有效吗" —— 那是一次阻塞每个请求的网络调用，代价远超它挡掉的那点无效
 * 渲染。cookie 在但会话已失效的情况由应用自己兜底：业务接口返回 401，
 * AdminSessionProvider 再走一次跳转。那是**少数路径**，值得慢；首访是多数路径，
 * 必须快。
 *
 * presence cookie 是 httpOnly 的，只有服务端读得到 —— 判断全在这里和 BFF，
 * 页面脚本不参与。它也不是授权凭据：伪造它最坏只会让人**多走**一次交互登录。
 */

import { NextResponse, type NextRequest } from "next/server";

/** RP 会话 cookie：生产 https 走 `__Host-` 前缀，本地 http 走裸名，两个都认。 */
const RP_SESSION_COOKIES = ["__Host-vx_rp_session", "vx_rp_session"];
/** 身份状态缓存，由 admin-bff 在静默探测失败时种下（见 oidc-auth.router.ts）。 */
const PRESENCE_COOKIE = "vx_admin_sso_presence";

/**
 * 不参与认证决策的路径：
 * - `/auth/*` 是 RP 端点本身（本地经 next.config 的 shim 代理到 admin-bff，
 *   生产由 nginx 反代）。放进决策会造成自己跳自己的死循环。
 * - `/login` 是历史中转页，它自己就负责跳登录。
 * - 静态资源与 Next 内部路径没有身份含义，拦下来只是白白加一层。
 */
function isExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/varda/") ||
    pathname === "/login" ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname) // 带扩展名的一律当静态资源
  );
}

/** BFF 在静默探测失败后挂回 returnTo 上的一次性标记。 */
const SILENT_FAILED_PARAM = "vx_sso_silent";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isExempt(pathname)) return NextResponse.next();

  const hasSession = RP_SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (hasSession) return NextResponse.next(); // Authenticated

  /* Anonymous 的判定**有两个独立来源，缺一不可**：
   *
   *   ① presence cookie   —— 持久（5 分钟），跨刷新、跨新开标签页都记得
   *   ② URL 上的 vx_sso_silent=0 —— 一次性，但**不依赖 cookie 能否落盘**
   *
   * 只靠 ① 会死循环：静默探测失败 → BFF 跳回 `/?vx_sso_silent=0` → middleware
   * 若读不到 cookie 就再发一次 prompt=none → 无穷。cookie 存不住的原因可以有
   * 很多（浏览器拦截、Secure 策略、SameSite、非浏览器客户端），而这条链路一旦
   * 转起来是**整站不可用**，比它要解决的闪烁严重得多。② 是让循环在任何 cookie
   * 状态下都能断掉的兜底 —— 它就写在上一跳给我们的 URL 里，本来就该看。
   * （2026-08-04：先只做了 ①，用 curl（无 cookie jar）实测立刻打出无限重定向。） */
  const silentJustFailed =
    req.nextUrl.searchParams.get(SILENT_FAILED_PARAM) === "0";
  const isAnonymous =
    silentJustFailed || req.cookies.get(PRESENCE_COOKIE)?.value === "anonymous";

  /* returnTo 里要去掉 vx_sso_silent —— 它是上一跳的产物，带着它绕回来只会让
   * 参数越滚越长（实测 returnTo 里能套出好几层）。 */
  const target = req.nextUrl.clone();
  target.searchParams.delete(SILENT_FAILED_PARAM);

  /* 回到自己的 origin 上的 /auth/login —— 本地由 next.config 的 shim 代理到
   * admin-bff，生产由 nginx 反代。用同源相对路径，真实主机名不进代码。 */
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/auth/login";
  loginUrl.search = "";
  loginUrl.searchParams.set(
    "returnTo",
    `${target.origin}${target.pathname}${target.search}`,
  );
  // Anonymous 已确认没有中央会话，直接交互式；只有 Unknown 才值得静默问一次。
  if (!isAnonymous) loginUrl.searchParams.set("prompt", "none");

  return NextResponse.redirect(loginUrl);
}

export const config = {
  /* 负向匹配把静态资源挡在 middleware 之外（`isExempt` 是第二道保险，
   * 两者都留着：matcher 省的是调用开销，isExempt 保的是正确性）。 */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
