// Product catalog domain types — unified `product` + versioned `plan`
// (docs/design/platform-data-architecture-schema.md §7). Replaces the legacy
// agent / application / feature / plan+plan_price+plan_feature+plan_agent model.

// ── Product (merged agent + application) ─────────────────────────────────────

export interface ProductRecord {
  id: string;
  productCode: string;
  productType: string;
  categoryId: number | null;
  description: string | null;
  capabilityKeys: string[]; // gateable feature keys (replaces agent_feature)
  tags: string[];
  standaloneSubscribable: boolean;
  iconUrl: string | null;
  sort: number;
  config: Record<string, unknown> | null;
  releaseVersion: string | null;
  buildNumber: string | null;
  releasedAt: Date | null;
  status: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProductI18nRecord {
  productId: string;
  locale: string;
  productName: string; // brand/proper name
  productNick: string; // gloss/localized name
  description: string | null;
}

export interface ProductMetricRecord {
  id: string;
  productId: string;
  metricKey: string;
  mergeStrategy: string; // max | union | pool
  consumeMode: string | null; // divisible | atomic (pool only)
  metricUnit: string | null;
}

export interface ProductDetail extends ProductRecord {
  i18n: ProductI18nRecord[];
  metrics: ProductMetricRecord[];
}

export interface ProductCategoryRecord {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
  sort: number;
}

// ── Versioned plan: plan (shell) + plan_version (immutable) + plan_component ──

export interface PlanRecord {
  id: string;
  planCode: string;
  planName: string;
  description: string | null;
  currentVersionId: string | null;
  isPublic: boolean;
  status: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PlanVersionRecord {
  id: string;
  planId: string;
  versionNo: number;
  isLocked: boolean; // frozen once referenced by a subscription (§7 triggers)
  trialCycleUnit: string | null; // day | week | month (null = no trial)
  trialCycleCount: number | null;
  // Derived, not a column: 'published' when this version is the plan's
  // current_version_id, else 'draft'. plan_versions has no status column now.
  status: string;
  createdBy: string | null;
  createdAt: Date;
}

export interface PlanComponentRecord {
  id: string;
  planVersionId: string;
  productId: string;
  tier: string; // standard | starter | pro | business | enterprise
  componentRole: string; // primary | bundled (D6, product_220 §2)
  priority: number;
  features: string[];
  quota: Record<string, unknown> | null;
  sortOrder: number;
}

export interface PlanDetail extends PlanRecord {
  currentVersion: PlanVersionRecord | null;
  components: PlanComponentRecord[]; // components of the current version
}

// ── Params / inputs ──────────────────────────────────────────────────────────

export interface ListProductsParams {
  status?: string;
  productType?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ListPlansParams {
  status?: string;
  isPublic?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateProductInput {
  productCode: string;
  productType: string;
  productName: string; // brand/proper name — products.product_name is NOT NULL
  productNick?: string; // gloss/localized name — products.product_nick (optional)
  categoryId?: number;
  description?: string;
  capabilityKeys?: string[];
  tags?: string[];
  standaloneSubscribable?: boolean;
  iconUrl?: string;
  config?: Record<string, unknown>;
  createdBy: string;
}

export interface UpdateProductInput {
  productType?: string;
  categoryId?: number | null;
  description?: string;
  capabilityKeys?: string[];
  tags?: string[];
  standaloneSubscribable?: boolean;
  iconUrl?: string;
  sort?: number;
  config?: Record<string, unknown>;
  releaseVersion?: string;
  buildNumber?: string;
  status?: string;
  updatedBy: string;
}

export interface SetProductI18nInput {
  productId: string;
  entries: {
    locale: string;
    productName: string;
    productNick: string;
    description?: string;
  }[];
}

export interface CreatePlanInput {
  planCode: string;
  planName: string;
  description?: string;
  isPublic?: boolean;
  createdBy: string;
}

export interface PlanComponentInput {
  productId: string;
  tier: string;
  componentRole: string;
  priority?: number;
  features?: string[];
  quota?: Record<string, unknown>;
  sortOrder?: number;
}

// Per-cycle price row (product.plan_prices). Pricing moved off plan_versions to
// N per-cycle rows per version. price required; cycleCount/currency have DB defaults.
export interface PlanPriceInput {
  cycleUnit: string; // day | week | month | year | perpetual
  cycleCount?: number; // default 1 (季=month×3, 年=year×1 …)
  price: string | number; // NUMERIC(18,6); free = 0
  currency?: string; // default CNY
}

export interface CreatePlanVersionInput {
  planId: string;
  components: PlanComponentInput[];
  // Optional per-cycle prices inserted into product.plan_prices in the same
  // transaction. Omit / empty = a free or trial version with no priced cycles.
  prices?: PlanPriceInput[];
  createdBy: string;
}
