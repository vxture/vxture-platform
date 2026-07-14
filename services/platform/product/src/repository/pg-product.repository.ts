import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PRODUCT_PG_POOL } from "../tokens";
import type {
  CreatePlanInput,
  CreatePlanVersionInput,
  CreateProductInput,
  ListPlansParams,
  ListProductsParams,
  PlanComponentRecord,
  PlanDetail,
  PlanRecord,
  PlanVersionRecord,
  ProductCategoryRecord,
  ProductDetail,
  ProductI18nRecord,
  ProductMetricRecord,
  ProductRecord,
  SetProductI18nInput,
  UpdateProductInput,
} from "../types/product.types";

interface ProductRow {
  id: string;
  product_code: string;
  product_type: string;
  category_id: number | null;
  description: string | null;
  capability_keys: string[];
  tags: string[];
  standalone_subscribable: boolean;
  icon_url: string | null;
  sort: number;
  config: Record<string, unknown> | null;
  release_version: string | null;
  build_number: string | null;
  released_at: Date | null;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
interface PlanRow {
  id: string;
  plan_code: string;
  plan_name: string;
  description: string | null;
  current_version_id: string | null;
  is_public: boolean;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
interface PlanVersionRow {
  id: string;
  plan_id: string;
  version_no: number;
  is_locked: boolean;
  trial_cycle_unit: string | null;
  trial_cycle_count: number | null;
  created_by: string | null;
  created_at: Date;
}
interface PlanComponentRow {
  id: string;
  plan_version_id: string;
  product_id: string;
  tier: string;
  component_role: string;
  priority: number;
  features: string[];
  quota: Record<string, unknown> | null;
  sort_order: number;
}

function mapProduct(r: ProductRow): ProductRecord {
  return {
    id: r.id,
    productCode: r.product_code,
    productType: r.product_type,
    categoryId: r.category_id,
    description: r.description,
    capabilityKeys: r.capability_keys ?? [],
    tags: r.tags ?? [],
    standaloneSubscribable: r.standalone_subscribable,
    iconUrl: r.icon_url,
    sort: r.sort,
    config: r.config,
    releaseVersion: r.release_version,
    buildNumber: r.build_number,
    releasedAt: r.released_at,
    status: r.status,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}
function mapPlan(r: PlanRow): PlanRecord {
  return {
    id: r.id,
    planCode: r.plan_code,
    planName: r.plan_name,
    description: r.description,
    currentVersionId: r.current_version_id,
    isPublic: r.is_public,
    status: r.status,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}
// version_status has no column: it derives to 'published' when the version is
// the plan's current_version_id, else 'draft'. Pass currentVersionId to resolve.
function mapVersion(
  r: PlanVersionRow,
  currentVersionId: string | null = null,
): PlanVersionRecord {
  return {
    id: r.id,
    planId: r.plan_id,
    versionNo: r.version_no,
    isLocked: r.is_locked,
    trialCycleUnit: r.trial_cycle_unit,
    trialCycleCount: r.trial_cycle_count,
    status:
      currentVersionId !== null && currentVersionId === r.id
        ? "published"
        : "draft",
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}
function mapComponent(r: PlanComponentRow): PlanComponentRecord {
  return {
    id: r.id,
    planVersionId: r.plan_version_id,
    productId: r.product_id,
    tier: r.tier,
    componentRole: r.component_role,
    priority: r.priority,
    features: r.features ?? [],
    quota: r.quota,
    sortOrder: r.sort_order,
  };
}

/**
 * Raw-SQL repository for the unified product catalog (product / product_i18n /
 * product_metric / product_category / plan / plan_version / plan_component),
 * per platform-data-architecture-schema.md §7. Uses pg.Pool (no Prisma).
 */
@Injectable()
export class PgProductRepository {
  constructor(@Inject(PRODUCT_PG_POOL) private readonly pool: Pool) {}

  // ── Product ────────────────────────────────────────────────────────────────

  async listProducts(
    params: ListProductsParams,
  ): Promise<{ items: ProductRecord[]; total: number }> {
    const conds = ["deleted_at is null"];
    const vals: unknown[] = [];
    let i = 1;
    if (params.status) {
      conds.push(`status = $${i++}`);
      vals.push(params.status);
    }
    if (params.productType) {
      conds.push(`product_type = $${i++}`);
      vals.push(params.productType);
    }
    if (params.keyword) {
      conds.push(`product_code ilike $${i++}`);
      vals.push(`%${params.keyword}%`);
    }
    const where = conds.join(" and ");
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const [countRes, rowsRes] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from product.products where ${where}`,
        vals,
      ),
      this.pool.query<ProductRow>(
        `select * from product.products where ${where}
          order by sort asc, created_at desc limit $${i} offset $${i + 1}`,
        [...vals, pageSize, (page - 1) * pageSize],
      ),
    ]);
    return {
      total: parseInt(countRes.rows[0]?.count ?? "0", 10),
      items: rowsRes.rows.map(mapProduct),
    };
  }

  async getProduct(id: string): Promise<ProductRecord | null> {
    const res = await this.pool.query<ProductRow>(
      `select * from product.products where id = $1 and deleted_at is null limit 1`,
      [id],
    );
    return res.rows[0] ? mapProduct(res.rows[0]) : null;
  }

  async getProductDetail(id: string): Promise<ProductDetail | null> {
    const product = await this.getProduct(id);
    if (!product) return null;
    const [i18nRes, metricRes] = await Promise.all([
      // Legacy per-locale product_i18n table retired; names are now the
      // product_name/product_nick columns on product.products (40_product.sql).
      this.pool.query(
        `select id as product_id, product_name, product_nick, description
           from product.products where id = $1`,
        [id],
      ),
      this.pool.query(
        `select id, product_id, metric_key, merge_strategy, consume_mode, metric_unit
           from product.product_metrics where product_id = $1 order by metric_key`,
        [id],
      ),
    ]);
    const i18n: ProductI18nRecord[] = i18nRes.rows.map((r) => ({
      productId: r.product_id,
      // per-locale dimension retired; single canonical name pair on products
      locale: "default",
      productName: r.product_name,
      productNick: r.product_nick,
      description: r.description,
    }));
    const metrics: ProductMetricRecord[] = metricRes.rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      metricKey: r.metric_key,
      mergeStrategy: r.merge_strategy,
      consumeMode: r.consume_mode,
      metricUnit: r.metric_unit,
    }));
    return { ...product, i18n, metrics };
  }

  async createProduct(input: CreateProductInput): Promise<ProductRecord> {
    try {
      const res = await this.pool.query<ProductRow>(
        `insert into product.products
           (product_code, product_type, product_name, product_nick, category_id, description,
            capability_keys, tags, standalone_subscribable, icon_url, config, status, created_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,coalesce($9,true),$10,$11,'active',$12,now(),now())
         returning *`,
        [
          input.productCode,
          input.productType,
          input.productName,
          input.productNick ?? null,
          input.categoryId ?? null,
          input.description ?? null,
          input.capabilityKeys ?? [],
          input.tags ?? [],
          input.standaloneSubscribable ?? null,
          input.iconUrl ?? null,
          input.config ?? null,
          input.createdBy,
        ],
      );
      return mapProduct(res.rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("product_code already in use");
      }
      throw error;
    }
  }

  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductRecord | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    const col = (c: string, v: unknown) => {
      sets.push(`${c} = $${i++}`);
      vals.push(v);
    };
    if (input.productType !== undefined) col("product_type", input.productType);
    if (input.categoryId !== undefined) col("category_id", input.categoryId);
    if (input.description !== undefined) col("description", input.description);
    if (input.capabilityKeys !== undefined)
      col("capability_keys", input.capabilityKeys);
    if (input.tags !== undefined) col("tags", input.tags);
    if (input.standaloneSubscribable !== undefined)
      col("standalone_subscribable", input.standaloneSubscribable);
    if (input.iconUrl !== undefined) col("icon_url", input.iconUrl);
    if (input.sort !== undefined) col("sort", input.sort);
    if (input.config !== undefined) col("config", input.config);
    if (input.releaseVersion !== undefined)
      col("release_version", input.releaseVersion);
    if (input.buildNumber !== undefined) col("build_number", input.buildNumber);
    if (input.status !== undefined) col("status", input.status);
    col("updated_by", input.updatedBy);
    sets.push("updated_at = now()");
    const res = await this.pool.query<ProductRow>(
      `update product.products set ${sets.join(", ")}
        where id = $${i} and deleted_at is null returning *`,
      [...vals, id],
    );
    return res.rows[0] ? mapProduct(res.rows[0]) : null;
  }

  async setProductI18n(input: SetProductI18nInput): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      for (const e of input.entries) {
        // product_i18n retired: names/description are single columns on
        // product.products now. locale dimension is dropped; entries collapse
        // onto the one canonical row (last entry wins).
        await client.query(
          `update product.products set
             product_name = $2,
             product_nick = $3,
             description = coalesce($4, description),
             updated_at = now()
           where id = $1`,
          [
            input.productId,
            e.productName,
            e.productNick,
            e.description ?? null,
          ],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async listCategories(): Promise<ProductCategoryRecord[]> {
    const res = await this.pool.query(
      `select id, parent_id, code, name, sort from product.product_categories
        order by sort asc, id asc`,
    );
    return res.rows.map((r) => ({
      id: r.id,
      parentId: r.parent_id,
      code: r.code,
      name: r.name,
      sort: r.sort,
    }));
  }

  // ── Plan (versioned) ─────────────────────────────────────────────────────────

  async listPlans(
    params: ListPlansParams,
  ): Promise<{ items: PlanRecord[]; total: number }> {
    const conds = ["deleted_at is null"];
    const vals: unknown[] = [];
    let i = 1;
    if (params.status) {
      conds.push(`status = $${i++}`);
      vals.push(params.status);
    }
    if (params.isPublic !== undefined) {
      conds.push(`is_public = $${i++}`);
      vals.push(params.isPublic);
    }
    const where = conds.join(" and ");
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const [countRes, rowsRes] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from product.plans where ${where}`,
        vals,
      ),
      this.pool.query<PlanRow>(
        `select * from product.plans where ${where}
          order by created_at desc limit $${i} offset $${i + 1}`,
        [...vals, pageSize, (page - 1) * pageSize],
      ),
    ]);
    return {
      total: parseInt(countRes.rows[0]?.count ?? "0", 10),
      items: rowsRes.rows.map(mapPlan),
    };
  }

  async getPlanDetail(id: string): Promise<PlanDetail | null> {
    const planRes = await this.pool.query<PlanRow>(
      `select * from product.plans where id = $1 and deleted_at is null limit 1`,
      [id],
    );
    const planRow = planRes.rows[0];
    if (!planRow) return null;
    const plan = mapPlan(planRow);
    let currentVersion: PlanVersionRecord | null = null;
    let components: PlanComponentRecord[] = [];
    if (plan.currentVersionId) {
      const [vRes, cRes] = await Promise.all([
        this.pool.query<PlanVersionRow>(
          `select * from product.plan_versions where id = $1 limit 1`,
          [plan.currentVersionId],
        ),
        this.pool.query<PlanComponentRow>(
          `select * from product.plan_components where plan_version_id = $1
            order by sort_order asc, priority asc`,
          [plan.currentVersionId],
        ),
      ]);
      currentVersion = vRes.rows[0]
        ? mapVersion(vRes.rows[0], plan.currentVersionId)
        : null;
      components = cRes.rows.map(mapComponent);
    }
    return { ...plan, currentVersion, components };
  }

  async createPlan(input: CreatePlanInput): Promise<PlanRecord> {
    try {
      const res = await this.pool.query<PlanRow>(
        `insert into product.plans
           (plan_code, plan_name, description, is_public, status, created_by, created_at, updated_at)
         values ($1,$2,$3,coalesce($4,true),'active',$5,now(),now())
         returning *`,
        [
          input.planCode,
          input.planName,
          input.description ?? null,
          input.isPublic ?? null,
          input.createdBy,
        ],
      );
      return mapPlan(res.rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("plan_code already in use");
      }
      throw error;
    }
  }

  /**
   * Create a new immutable plan_version (next version_no) with its components,
   * in one transaction. The version starts unlocked; publishVersion locks it and
   * points plan.current_version_id at it.
   */
  async createPlanVersion(
    input: CreatePlanVersionInput,
  ): Promise<PlanVersionRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const noRes = await client.query<{ next_no: number }>(
        `select coalesce(max(version_no), 0) + 1 as next_no
           from product.plan_versions where plan_id = $1`,
        [input.planId],
      );
      const versionNo = noRes.rows[0]?.next_no ?? 1;
      // plan_versions no longer carries price/currency/status: it starts
      // is_locked=false (unlocked) with no trial; publishVersion locks it.
      const vRes = await client.query<PlanVersionRow>(
        `insert into product.plan_versions
           (plan_id, version_no, created_by, created_at)
         values ($1,$2,$3,now())
         returning *`,
        [input.planId, versionNo, input.createdBy],
      );
      // fresh version is not yet current → status derives to 'draft'
      const version = mapVersion(vRes.rows[0]!);
      for (const c of input.components) {
        await client.query(
          `insert into product.plan_components
             (plan_version_id, product_id, tier, component_role, priority, features, quota, sort_order, created_at)
           values ($1,$2,$3,$4,coalesce($5,100),$6,$7,coalesce($8,0),now())`,
          [
            version.id,
            c.productId,
            c.tier,
            c.componentRole,
            c.priority ?? null,
            c.features ?? [],
            c.quota ?? null,
            c.sortOrder ?? null,
          ],
        );
      }
      // Per-cycle prices → product.plan_prices (same txn). None = free/trial version.
      for (const pr of input.prices ?? []) {
        await client.query(
          `insert into product.plan_prices
             (plan_version_id, cycle_unit, cycle_count, price, currency, created_at)
           values ($1,$2,coalesce($3,1),$4,coalesce($5,'CNY'),now())`,
          [
            version.id,
            pr.cycleUnit,
            pr.cycleCount ?? null,
            String(pr.price),
            pr.currency ?? null,
          ],
        );
      }
      await client.query("commit");
      return version;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Publish a version: point plan.current_version_id at it (→ derives
   * 'published') and lock it (is_locked=true), which freezes its components +
   * prices via the §7 triggers. One transaction; idempotent for an already-current
   * locked version. plan_versions has no status/published_at columns anymore.
   */
  async publishVersion(planId: string, versionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `update product.plans set current_version_id = $2, updated_at = now() where id = $1`,
        [planId, versionId],
      );
      await client.query(
        `update product.plan_versions set is_locked = true
          where id = $2 and plan_id = $1`,
        [planId, versionId],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
