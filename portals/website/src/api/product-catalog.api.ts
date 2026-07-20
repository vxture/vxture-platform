/**
 * product-catalog.api.ts - 公开产品目录读取（website 侧）
 * @package @vxture/website
 * @layer Presentation
 * @category API
 *
 * 读客户可见产品的公开属性（当前=对外发布号 release_version），补充 i18n 静态
 * 文案。版本单一真源在 product.products，不再硬编码在 i18n。公开端点，匿名可读。
 */

import { apiClient } from "./client";

export interface ProductCatalogItem {
  productCode: string;
  releaseVersion: string | null;
}

export async function fetchProductCatalog(): Promise<ProductCatalogItem[]> {
  const res = await apiClient.get<ProductCatalogItem[]>(
    "/api/products/catalog",
  );
  return Array.isArray(res.data) ? res.data : [];
}
