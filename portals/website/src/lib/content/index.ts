/**
 * index.ts - Content Registry 公共导出
 * @package @vxture/website
 * @layer Presentation
 * @category Content Registry
 * @author AI-Generated
 * @date 2026-05-06
 */

// 类型
export type {
  ContentSection,
  ContentLayout,
  ContentEntry,
  LegalIndexEntry,
  LegalDetailEntry,
  BlogIndexEntry,
  BlogPostEntry,
  StubEntry,
  ContentLoader,
  ContentStaticParamsGenerator,
  ContentSectionConfig,
} from "./types";

// Registry 核心
export {
  CONTENT_REGISTRY,
  isContentSection,
  aggregateContentStaticParams,
} from "./registry";

// Loaders（按需导出，供需要精细控制的场景使用）
export { legalLoader, legalStaticParams } from "./loaders/legal.loader";
export { blogLoader, blogStaticParams } from "./loaders/blog.loader";
export { createStubLoader } from "./loaders/stub.loader";
