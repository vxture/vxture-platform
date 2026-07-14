/**
 * resetScrollTop.utils.ts - 滚动工具函数
 * @package @vxture/platform-browser
 *
 * Description: 浏览器滚动工具函数，包含窗口滚动重置功能。
 *
 * @layer Infrastructure
 * @category Utils
 *
 * @remarks
 * - 仅在浏览器环境使用
 * - 处理服务端渲染 (SSR) 兼容
 */

/**
 * 滚动行为类型
 */
export type ScrollBehavior = "auto" | "smooth" | "instant";

/**
 * 重置窗口滚动到顶部
 * @param behavior - 滚动行为
 */
export const resetWindowScrollTop = (
  behavior: ScrollBehavior = "instant",
): void => {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior });
  }
};
