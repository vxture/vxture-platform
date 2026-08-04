/**
 * navPreference.ts - 侧栏收起态的持久化（cookie，非 localStorage）。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Theme
 *
 * **为什么是 cookie。** 收起态原先存在 localStorage 里，配 `useState(false)` +
 * `useEffect` 读取——localStorage 只有 JS 跑起来之后才读得到，所以**首帧一定是
 * 展开的**，读完才收起。用户看到的就是刷新时"导航先展开再收起"那一下跳变
 * （2026-08-05 owner 在 console/admin 实测）。这不是时序没调好，是这个存储介质
 * 天然赶不上首屏：它对服务端不可见。
 *
 * cookie 随请求一起到服务端，layout（服务端组件）读出来当作初始值传下去，首帧
 * 即最终态。这与认证链路选择 middleware 而不是客户端判定是同一条原则：**凡是
 * 首帧需要知道的东西，都不能等 JS**。
 *
 * 另一条路是内联阻塞脚本（主题就是这么做的），但它会阻塞首绘；既然这里已经有
 * 服务端渲染的时机可用，就不必再拦一次绘制。
 *
 * cookie 名带产品前缀，不共用：本地四个门户同在 `localhost`，而 cookie 无视端口，
 * 共用名会让一个门户的收起态串到另一个门户上。
 */

/** `vx_<prefix>_nav_collapsed`。prefix 用产品代号（console / admin / opera）。 */
export function navCollapsedCookieName(prefix: string): string {
  return `vx_${prefix}_nav_collapsed`;
}

/** 一年。UI 偏好没有安全含义，过期只会让它回到默认展开态。 */
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * 客户端写入。**不设 httpOnly**——服务端要读，客户端也要写，两边都得看得见；
 * 它不承载任何凭据，最坏情况是别人替你把侧栏收起来。
 */
export function writeNavCollapsed(prefix: string, collapsed: boolean): void {
  if (typeof document === "undefined") return;
  const name = navCollapsedCookieName(prefix);
  document.cookie = `${name}=${collapsed ? "1" : "0"}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

/**
 * 从 cookie 串里解析。服务端传 `cookies().toString()` 或请求头，客户端传
 * `document.cookie`——两边同一份解析逻辑，避免"服务端认 1、客户端认 true"这类
 * 只在特定值下才暴露的分叉。
 */
export function readNavCollapsed(
  cookieString: string | undefined | null,
  prefix: string,
): boolean {
  if (!cookieString) return false;
  const name = navCollapsedCookieName(prefix);
  for (const part of cookieString.split(";")) {
    const [k, v] = part.split("=");
    if (k?.trim() === name) return v?.trim() === "1";
  }
  return false;
}
