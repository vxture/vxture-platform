/**
 * stub.loader.ts - 占位 Loader 工厂
 * @package @vxture/website
 * @layer Presentation
 * @category Content Registry / Loaders
 * @author AI-Generated
 * @date 2026-05-06
 */

import type { ContentLoader, ContentSection } from "../types";

/**
 * 生成仅处理区段根路径的占位 loader。
 * 渲染结果为「开发中」占位页。
 *
 * 升级路径：将某个区段从 stub 替换为真实 loader 时，
 * 只需在 registry.ts 中替换对应 entry，此工厂不变。
 *
 * @param section - Content 区段标识，透传至 StubEntry 供渲染层使用
 */
export function createStubLoader(section: ContentSection): ContentLoader {
  return async (slug) => {
    // 只处理根路径，子路径暂不支持
    if (slug.length > 0) return null;
    return { type: "stub", layout: "prose", section };
  };
}
