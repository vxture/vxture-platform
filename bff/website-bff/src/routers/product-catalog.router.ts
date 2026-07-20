/**
 * product-catalog.router.ts - 公开产品目录（website 侧）
 * @package @vxture/bff-website
 *
 * GET /api/products/catalog —— 客户可见产品的公开属性（当前=对外发布号
 * release_version），驱动官网产品卡片的版本展示。**公开端点**（无需登录）：
 * AuthMiddleware 非阻断，匿名亦可读。产品营销文案（名/描述/价值）仍走 i18n；
 * 此处只补 DB 权威的动态属性（版本），版本单一真源在 product.products。
 */
import { Controller, Get, Inject } from "@nestjs/common";
import type { Pool } from "pg";
import { WEBSITE_BFF_RO_POOL } from "../providers/pg-pool.provider";

export interface ProductCatalogItem {
  productCode: string;
  releaseVersion: string | null;
}

@Controller("api/products")
export class ProductCatalogRouter {
  constructor(@Inject(WEBSITE_BFF_RO_POOL) private readonly pool: Pool) {}

  @Get("catalog")
  async getCatalog(): Promise<ProductCatalogItem[]> {
    const res = await this.pool.query<{
      product_code: string;
      release_version: string | null;
    }>(
      `select product_code, release_version
         from product.products
        where is_customer_visible = true
          and status = 'active'
          and deleted_at is null
        order by sort asc`,
    );
    return res.rows.map((r) => ({
      productCode: r.product_code,
      releaseVersion: r.release_version,
    }));
  }
}
