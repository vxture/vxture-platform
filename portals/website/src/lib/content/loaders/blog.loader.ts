/**
 * blog.loader.ts - Blog 内容加载器（占位实现）
 * @package @vxture/website
 * @layer Presentation
 * @category Content Registry / Loaders
 * @author AI-Generated
 * @date 2026-05-06
 */

import type { ContentLoader } from "../types";

/**
 * Blog loader 占位实现
 *
 * 今天：/blog 返回空列表入口，/blog/[slug] 返回 null（404）
 * 未来：替换为 CMS API 调用或 MDX 文件系统扫描，接口不变
 */
export const blogLoader: ContentLoader = async (slug) => {
  // /blog（列表页）
  if (slug.length === 0) {
    return { type: "blog-index", layout: "article" };
  }

  // /blog/[slug]：占位阶段无文章，返回 null 触发 404
  // 未来：从 CMS 或 MDX 按 slug 加载文章内容
  return null;
};

/**
 * Blog 静态路径：占位阶段仅生成 /blog 根路径，无文章页
 * 未来：从 CMS 获取所有文章 slug 并生成对应路径
 */
export function blogStaticParams(): string[][] {
  return [[]];
}
