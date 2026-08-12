/**
 * product-catalog.router.ts — 产品目录注册（product.products CRUD）。
 * @package @vxture/bff-opera
 * @layer Application
 * @category Router
 *
 * "产品发布管理"第一阶段（2026-08-12）：`product.products` 此前只有
 * admin-bff `products.router.ts` 的只读 + plan-version 发布，全仓没有任何地方
 * 能新建/编辑一行产品记录——这是真实缺口，不是重复造轮子。
 *
 * 归属：opera 技术运维面（"产品目录"是基础设施登记，不是商业定价），admin 现
 * 有的产品展示（读 + 订阅套餐发布）原样不动、不跨包引用——两个 *-bff 之间零
 * 交叉引用的纪律延续到这里。
 *
 * 数据源：`product.products` 直接查（opera-bff 自己的 pg pool，
 * `OperaBffPoolsModule`），不是代理外部服务——这张表没有独立微服务可代理，
 * job-scheduler/product-health 两个router 已经是同样的直连模式。
 *
 * origin/origin_provider 两个字段（2026-08-12 迁移）是这次新增的来源轴：
 * self=平台自建、third_party=第三方接入、other；third_party 时
 * origin_provider 必填（DB CHECK 兜底，这里的校验只是提前给用户更好的错误）。
 *
 * 能力码：`platform:product.read` / `platform:product.manage`。
 */

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { Pool } from "pg";
import { OPERA_BFF_RW_POOL } from "../tokens";
import type { RequestContext } from "../types/request-context";

const PRODUCT_READ = "platform:product.read";
const PRODUCT_MANAGE = "platform:product.manage";

const STATUSES = ["active", "inactive", "draft", "deprecated"] as const;
type ProductStatus = (typeof STATUSES)[number];
const ORIGINS = ["self", "third_party", "other"] as const;
type ProductOrigin = (typeof ORIGINS)[number];

export interface ProductCategoryRecord {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
}

export interface ProductRecord {
  id: string;
  productCode: string;
  productType: string;
  categoryId: number | null;
  productName: string;
  productNick: string | null;
  description: string | null;
  capabilityKeys: string[];
  tags: string[];
  standaloneSubscribable: boolean;
  status: ProductStatus;
  isCustomerVisible: boolean;
  isWorkforceVisible: boolean;
  origin: ProductOrigin;
  originProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductRow {
  id: string;
  product_code: string;
  product_type: string;
  category_id: number | null;
  product_name: string;
  product_nick: string | null;
  description: string | null;
  capability_keys: string[];
  tags: string[];
  standalone_subscribable: boolean;
  status: ProductStatus;
  is_customer_visible: boolean;
  is_workforce_visible: boolean;
  origin: ProductOrigin;
  origin_provider: string | null;
  created_at: string;
  updated_at: string;
}

function toRecord(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    productCode: row.product_code,
    productType: row.product_type,
    categoryId: row.category_id,
    productName: row.product_name,
    productNick: row.product_nick,
    description: row.description,
    capabilityKeys: row.capability_keys,
    tags: row.tags,
    standaloneSubscribable: row.standalone_subscribable,
    status: row.status,
    isCustomerVisible: row.is_customer_visible,
    isWorkforceVisible: row.is_workforce_visible,
    origin: row.origin,
    originProvider: row.origin_provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ProductWriteBody {
  productCode?: string;
  productType?: string;
  categoryId?: number | null;
  productName?: string;
  productNick?: string | null;
  description?: string | null;
  capabilityKeys?: string[];
  tags?: string[];
  standaloneSubscribable?: boolean;
  isCustomerVisible?: boolean;
  isWorkforceVisible?: boolean;
  origin?: ProductOrigin;
  originProvider?: string | null;
}

const SELECT_COLUMNS = `
  id, product_code, product_type, category_id, product_name, product_nick,
  description, capability_keys, tags, standalone_subscribable, status,
  is_customer_visible, is_workforce_visible, origin, origin_provider,
  created_at, updated_at
`;

@Controller("api/products")
export class ProductCatalogRouter {
  constructor(@Inject(OPERA_BFF_RW_POOL) private readonly pool: Pool) {}

  @Get()
  async list(
    @Req() req: Request & RequestContext,
    @Query("origin") origin?: string,
    @Query("status") status?: string,
  ): Promise<ProductRecord[]> {
    assertCanRead(req);
    const clauses: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    if (origin && (ORIGINS as readonly string[]).includes(origin)) {
      params.push(origin);
      clauses.push(`origin = $${params.length}`);
    }
    if (status && (STATUSES as readonly string[]).includes(status)) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    const result = await this.pool.query<ProductRow>(
      `SELECT ${SELECT_COLUMNS} FROM product.products
        WHERE ${clauses.join(" AND ")}
        ORDER BY product_code ASC`,
      params,
    );
    return result.rows.map(toRecord);
  }

  @Get("categories")
  async listCategories(
    @Req() req: Request & RequestContext,
  ): Promise<ProductCategoryRecord[]> {
    assertCanRead(req);
    const result = await this.pool.query<{
      id: number;
      parent_id: number | null;
      code: string;
      name: string;
    }>(
      `SELECT id, parent_id, code, name FROM product.product_categories
        ORDER BY sort ASC, code ASC`,
    );
    return result.rows.map((r) => ({
      id: r.id,
      parentId: r.parent_id,
      code: r.code,
      name: r.name,
    }));
  }

  @Get(":id")
  async get(
    @Req() req: Request & RequestContext,
    @Param("id") id: string,
  ): Promise<ProductRecord | null> {
    assertCanRead(req);
    const result = await this.pool.query<ProductRow>(
      `SELECT ${SELECT_COLUMNS} FROM product.products
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  }

  @Post()
  async create(
    @Req() req: Request & RequestContext,
    @Body() body: ProductWriteBody,
  ): Promise<ProductRecord> {
    assertCanManage(req);
    validateWrite(body, { requireCore: true });
    const operatorId = req.operator?.id ?? null;
    const result = await this.pool.query<ProductRow>(
      `INSERT INTO product.products (
         product_code, product_type, category_id, product_name, product_nick,
         description, capability_keys, tags, standalone_subscribable, status,
         is_customer_visible, is_workforce_visible, origin, origin_provider,
         created_by, updated_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11, $12, $13, $14, $14
       ) RETURNING ${SELECT_COLUMNS}`,
      [
        body.productCode!.trim(),
        body.productType!.trim(),
        body.categoryId ?? null,
        body.productName!.trim(),
        body.productNick?.trim() || null,
        body.description?.trim() || null,
        body.capabilityKeys ?? [],
        body.tags ?? [],
        body.standaloneSubscribable ?? true,
        body.isCustomerVisible ?? true,
        body.isWorkforceVisible ?? true,
        body.origin ?? "self",
        body.originProvider?.trim() || null,
        operatorId,
      ],
    );
    return toRecord(result.rows[0]!);
  }

  @Put(":id")
  async update(
    @Req() req: Request & RequestContext,
    @Param("id") id: string,
    @Body() body: ProductWriteBody,
  ): Promise<ProductRecord> {
    assertCanManage(req);
    validateWrite(body, { requireCore: true });
    const operatorId = req.operator?.id ?? null;
    const result = await this.pool.query<ProductRow>(
      `UPDATE product.products SET
         product_type = $1, category_id = $2, product_name = $3,
         product_nick = $4, description = $5, capability_keys = $6, tags = $7,
         standalone_subscribable = $8, is_customer_visible = $9,
         is_workforce_visible = $10, origin = $11, origin_provider = $12,
         updated_by = $13, updated_at = now()
       WHERE id = $14 AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      [
        body.productType!.trim(),
        body.categoryId ?? null,
        body.productName!.trim(),
        body.productNick?.trim() || null,
        body.description?.trim() || null,
        body.capabilityKeys ?? [],
        body.tags ?? [],
        body.standaloneSubscribable ?? true,
        body.isCustomerVisible ?? true,
        body.isWorkforceVisible ?? true,
        body.origin ?? "self",
        body.originProvider?.trim() || null,
        operatorId,
        id,
      ],
    );
    if (!result.rows[0]) {
      throw new NotFoundException("Product not found");
    }
    return toRecord(result.rows[0]);
  }

  @Patch(":id/status")
  async setStatus(
    @Req() req: Request & RequestContext,
    @Param("id") id: string,
    @Body() body: { status?: string },
  ): Promise<ProductRecord> {
    assertCanManage(req);
    if (
      !body.status ||
      !(STATUSES as readonly string[]).includes(body.status)
    ) {
      throw new BadRequestException(
        `status must be one of ${STATUSES.join(", ")}`,
      );
    }
    const operatorId = req.operator?.id ?? null;
    const result = await this.pool.query<ProductRow>(
      `UPDATE product.products
          SET status = $1, updated_by = $2, updated_at = now()
        WHERE id = $3 AND deleted_at IS NULL
        RETURNING ${SELECT_COLUMNS}`,
      [body.status, operatorId, id],
    );
    if (!result.rows[0]) {
      throw new NotFoundException("Product not found");
    }
    return toRecord(result.rows[0]);
  }

  // ── 接入检查单（product_200 §7，六步技术接入）─────────────────────────────
  // 复用 product.launch_checklist_items 字典表——commerce 那两项
  // （verification_policy/pricing_set）留给 admin 消费，这里按 TECH_ITEM_CODES
  // 过滤，不读不写不属于 opera 的两项。

  @Get(":id/checklist")
  async getChecklist(
    @Req() req: Request & RequestContext,
    @Param("id") id: string,
  ): Promise<ChecklistItemRecord[]> {
    assertCanRead(req);
    const result = await this.pool.query<ChecklistRow>(
      `SELECT i.item_code, i.item_name, i.description, i.is_required, i.sort,
              s.is_satisfied, s.checked_at, s.remark
         FROM product.launch_checklist_items i
         LEFT JOIN product.product_launch_statuses s
           ON s.item_code = i.item_code AND s.product_id = $1
        WHERE i.item_code = ANY($2::text[])
        ORDER BY i.sort ASC`,
      [id, TECH_ITEM_CODES],
    );
    return result.rows.map(toChecklistRecord);
  }

  @Patch(":id/checklist/:itemCode")
  async setChecklistItem(
    @Req() req: Request & RequestContext,
    @Param("id") id: string,
    @Param("itemCode") itemCode: string,
    @Body() body: { isSatisfied?: boolean; remark?: string | null },
  ): Promise<ChecklistItemRecord> {
    assertCanManage(req);
    if (!(TECH_ITEM_CODES as readonly string[]).includes(itemCode)) {
      throw new NotFoundException(`Unknown checklist item: ${itemCode}`);
    }
    if (typeof body.isSatisfied !== "boolean") {
      throw new BadRequestException("isSatisfied is required");
    }
    const operatorId = req.operator?.id ?? null;
    await this.pool.query(
      `INSERT INTO product.product_launch_statuses
         (product_id, item_code, is_satisfied, checked_at, checked_by, remark)
       VALUES ($1, $2, $3, now(), $4, $5)
       ON CONFLICT (product_id, item_code) DO UPDATE SET
         is_satisfied = EXCLUDED.is_satisfied,
         checked_at = now(),
         checked_by = EXCLUDED.checked_by,
         remark = EXCLUDED.remark,
         updated_at = now()`,
      [id, itemCode, body.isSatisfied, operatorId, body.remark?.trim() || null],
    );
    const result = await this.pool.query<ChecklistRow>(
      `SELECT i.item_code, i.item_name, i.description, i.is_required, i.sort,
              s.is_satisfied, s.checked_at, s.remark
         FROM product.launch_checklist_items i
         LEFT JOIN product.product_launch_statuses s
           ON s.item_code = i.item_code AND s.product_id = $1
        WHERE i.item_code = $2`,
      [id, itemCode],
    );
    return toChecklistRecord(result.rows[0]!);
  }
}

const TECH_ITEM_CODES = [
  "catalog_registered",
  "c1_identity",
  "c3_metering",
  "c2_entitlement",
  "data_plane",
  "acceptance",
] as const;

export interface ChecklistItemRecord {
  itemCode: string;
  itemName: string;
  description: string | null;
  isRequired: boolean;
  sort: number;
  isSatisfied: boolean;
  checkedAt: string | null;
  remark: string | null;
}

interface ChecklistRow {
  item_code: string;
  item_name: string;
  description: string | null;
  is_required: boolean;
  sort: number;
  is_satisfied: boolean | null;
  checked_at: string | null;
  remark: string | null;
}

function toChecklistRecord(row: ChecklistRow): ChecklistItemRecord {
  return {
    itemCode: row.item_code,
    itemName: row.item_name,
    description: row.description,
    isRequired: row.is_required,
    sort: row.sort,
    isSatisfied: row.is_satisfied ?? false,
    checkedAt: row.checked_at,
    remark: row.remark,
  };
}

function assertCanRead(req: Request & RequestContext): void {
  if (!req.operator) {
    throw new UnauthorizedException("No active session");
  }
  if (
    !req.capabilities?.includes(PRODUCT_READ) &&
    !req.capabilities?.includes(PRODUCT_MANAGE)
  ) {
    throw new ForbiddenException(`Missing ${PRODUCT_READ} capability`);
  }
}

function assertCanManage(req: Request & RequestContext): void {
  if (!req.operator) {
    throw new UnauthorizedException("No active session");
  }
  if (!req.capabilities?.includes(PRODUCT_MANAGE)) {
    throw new ForbiddenException(`Missing ${PRODUCT_MANAGE} capability`);
  }
}

function validateWrite(
  body: ProductWriteBody,
  opts: { requireCore: boolean },
): void {
  if (opts.requireCore) {
    if (!body.productCode?.trim()) {
      throw new BadRequestException("productCode is required");
    }
    if (!body.productType?.trim()) {
      throw new BadRequestException("productType is required");
    }
    if (!body.productName?.trim()) {
      throw new BadRequestException("productName is required");
    }
  }
  if (body.origin && !(ORIGINS as readonly string[]).includes(body.origin)) {
    throw new BadRequestException(
      `origin must be one of ${ORIGINS.join(", ")}`,
    );
  }
  if (body.origin === "third_party" && !body.originProvider?.trim()) {
    throw new BadRequestException(
      "originProvider is required when origin=third_party",
    );
  }
}
