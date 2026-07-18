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
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { Pool } from "pg";
import { ADMIN_BFF_RO_POOL, ADMIN_BFF_RW_POOL } from "../tokens";
import { RequireStepUp } from "../auth/step-up.decorator";
import type {
  ProductAgentRecord,
  ProductCapabilityIntegration,
  ProductCapabilityMetricRule,
  ProductCapabilityRecord,
  ProductCapabilitySource,
  ProductCapabilityStatus,
  ProductCapabilityType,
  ProductModelPolicyRecord,
  ProductPlanRecord,
  ProductServicePlanDetailRecord,
  ProductServicePlanEntitlement,
  ProductServicePlanPrice,
  ProductSolutionDetailRecord,
  ProductReleaseRecord,
  ProductSolutionRecord,
  ProductSolutionServicePlanSummary,
  ProductSolutionTier,
  ProductSolutionTierCode,
  RequestContext,
} from "../types/console.types";

// Mock timestamp for the still-mock solutions/releases/model-policies endpoints
// (no schema backing — see the note above loadProductCapabilities). Capabilities
// and agents are now DB-backed and no longer use this.
const NOW = "2026-04-25T00:00:00.000Z";
const NEW_PRODUCT_DEFAULT_CODE = "__new_product_default__";
const TENANT_DEFAULT_CODE = "__tenant_default__";
const tierPlanCodeMap: Record<ProductSolutionTierCode, string> = {
  free: "starter",
  pro: "growth",
  enterprise: "enterprise",
  custom: "enterprise",
};

export const productSolutions: ProductSolutionRecord[] = [
  {
    id: "solution-flood-regulation",
    solutionCode: "flood-regulation",
    solutionName: "洪涝灾害监管业务",
    description:
      "面向水利、应急和城市治理客户的洪涝灾害监管方案，覆盖低空巡检、视频解译、调度协同、数据沉淀和报告编制。",
    industry: "应急管理 / 水利监管",
    scenario: "洪涝灾害监管",
    customerSegment: "省市应急、水利部门、园区管委会",
    status: "active",
    visibility: "public",
    ownerTeam: "行业解决方案组",
    subscriptionCount: 12,
    activeTenantCount: 10,
    monthlyRevenue: 128000,
    tags: ["低空巡检", "视频解译", "应急调度"],
    products: [
      {
        id: "flood-drone-platform",
        productCode: "drone-platform",
        productName: "无人机平台",
        productType: "platform",
        source: "partner",
        role: "飞行任务与设备接入",
        status: "active",
      },
      {
        id: "flood-dispatch-agent",
        productCode: "dispatch-agent",
        productName: "智能调度智能体",
        productType: "agent",
        source: "self",
        role: "灾情研判与任务调度",
        status: "active",
      },
      {
        id: "flood-video-model",
        productCode: "flood-video-interpretation",
        productName: "视频解译大模型",
        productType: "model",
        source: "partner",
        role: "水位、淹没区和险情识别",
        status: "active",
      },
      {
        id: "flood-data-platform",
        productCode: "disaster-data-platform",
        productName: "数据管理平台",
        productType: "data",
        source: "self",
        role: "遥感、视频和事件数据沉淀",
        status: "active",
      },
      {
        id: "flood-report-agent",
        productCode: "report-author-agent",
        productName: "报告编制智能体",
        productType: "agent",
        source: "self",
        role: "巡检报告与处置简报生成",
        status: "active",
      },
    ],
    tiers: [
      {
        tierCode: "free",
        tierName: "Free",
        summary: "1 台无人机，1 路视频解译，不含报告编制",
        status: "active",
        isPublic: true,
      },
      {
        tierCode: "pro",
        tierName: "Pro",
        summary: "50 台无人机，50 路视频解译，报告编制 100 万字/年",
        status: "active",
        isPublic: true,
      },
      {
        tierCode: "enterprise",
        tierName: "Enterprise",
        summary: "专属资源、合同约定配额和现场交付服务",
        status: "active",
        isPublic: true,
      },
    ],
    createdAt: NOW,
    updatedAt: "2026-04-28T00:00:00.000Z",
  },
  {
    id: "solution-smart-legal",
    solutionCode: "smart-legal",
    solutionName: "智慧法务",
    description:
      "面向企业法务、园区合规和政务法制场景，组合知识库、法务智能体、合同审查和报告编制能力。",
    industry: "企业服务 / 法务合规",
    scenario: "智慧法务",
    customerSegment: "集团法务、园区企业服务、政务法制部门",
    status: "active",
    visibility: "public",
    ownerTeam: "企业服务方案组",
    subscriptionCount: 18,
    activeTenantCount: 15,
    monthlyRevenue: 86000,
    tags: ["知识库", "合同审查", "报告编制"],
    products: [
      {
        id: "legal-kb-platform",
        productCode: "legal-knowledge-base",
        productName: "知识库平台",
        productType: "platform",
        source: "self",
        role: "法规、合同和案例知识沉淀",
        status: "active",
      },
      {
        id: "legal-agent",
        productCode: "digital-legal",
        productName: "法务智能体",
        productType: "agent",
        source: "self",
        role: "法律问答、合规检索和材料生成",
        status: "active",
      },
      {
        id: "legal-contract-agent",
        productCode: "contract-review",
        productName: "合同审核智能体",
        productType: "agent",
        source: "self",
        role: "合同条款抽取与风险提示",
        status: "active",
      },
      {
        id: "legal-report-agent",
        productCode: "report-author-agent",
        productName: "报告编制智能体",
        productType: "agent",
        source: "self",
        role: "法务报告、合规报告生成",
        status: "active",
      },
      {
        id: "legal-search-model",
        productCode: "legal-retrieval-model",
        productName: "法规检索模型",
        productType: "model",
        source: "partner",
        role: "法规语义检索与相似案例匹配",
        status: "active",
      },
    ],
    tiers: [
      {
        tierCode: "free",
        tierName: "Free",
        summary: "100 万字报告编制，基础知识库存储空间",
        status: "active",
        isPublic: true,
      },
      {
        tierCode: "pro",
        tierName: "Pro",
        summary: "1000 万字报告编制，高级合同审查和扩展存储空间",
        status: "active",
        isPublic: true,
      },
      {
        tierCode: "enterprise",
        tierName: "Enterprise",
        summary: "专属知识库、私有模型接入和法务交付服务",
        status: "active",
        isPublic: true,
      },
    ],
    createdAt: NOW,
    updatedAt: "2026-04-27T00:00:00.000Z",
  },
  {
    id: "solution-emergency-command",
    solutionCode: "emergency-command",
    solutionName: "应急指挥协同",
    description:
      "面向城市级应急指挥中心的跨部门协同方案，覆盖态势研判、资源调度、预案匹配和处置复盘。",
    industry: "应急管理 / 城市治理",
    scenario: "应急指挥协同",
    customerSegment: "城市应急指挥中心、区县应急局",
    status: "draft",
    visibility: "internal",
    ownerTeam: "城市治理方案组",
    subscriptionCount: 3,
    activeTenantCount: 1,
    monthlyRevenue: 32000,
    tags: ["态势研判", "预案匹配", "协同调度"],
    products: [
      {
        id: "emergency-command-agent",
        productCode: "emergency-command",
        productName: "应急指挥智能体",
        productType: "agent",
        source: "self",
        role: "预案匹配、态势研判和指挥建议",
        status: "active",
      },
      {
        id: "emergency-ops-agent",
        productCode: "operation-analysis",
        productName: "经营分析智能体",
        productType: "agent",
        source: "self",
        role: "事件复盘和指标归因",
        status: "active",
      },
      {
        id: "emergency-data-platform",
        productCode: "event-data-platform",
        productName: "事件数据平台",
        productType: "data",
        source: "self",
        role: "事件、资源和处置过程数据沉淀",
        status: "draft",
      },
      {
        id: "emergency-map-service",
        productCode: "gis-service",
        productName: "空间态势服务",
        productType: "service",
        source: "partner",
        role: "地图态势和空间分析能力",
        status: "draft",
      },
    ],
    tiers: [
      {
        tierCode: "free",
        tierName: "Free",
        summary: "单部门试用，基础预案匹配和少量事件复盘",
        status: "draft",
        isPublic: false,
      },
      {
        tierCode: "pro",
        tierName: "Pro",
        summary: "多部门协同、资源调度和月度处置复盘",
        status: "draft",
        isPublic: false,
      },
      {
        tierCode: "enterprise",
        tierName: "Enterprise",
        summary: "城市级专属部署、联动接口和现场保障服务",
        status: "draft",
        isPublic: false,
      },
    ],
    createdAt: NOW,
    updatedAt: "2026-04-26T00:00:00.000Z",
  },
];

export const productReleases: ProductReleaseRecord[] = [
  {
    id: "0bb203b6-7dfb-42d8-a6ad-920000000101",
    productCode: "vxture-console-cn",
    productName: "Vxture Console 国内版",
    productRegion: "domestic",
    productStatus: "active",
    releaseCode: "console-cn-2026-q2",
    releaseName: "2026 Q2 商业发布",
    description:
      "面向国内租户的 console 平台智能助手与运营能力发布，版本等级由本发布定义。",
    releaseType: "standard",
    versionLabels: ["基础版", "专业版", "企业版"],
    isFree: false,
    isPublic: true,
    isActive: true,
    prices: [
      {
        id: "c211fef4-88ef-45cc-bfe4-940000000101",
        currency: "CNY",
        price: 2999,
        originalPrice: 3999,
        periodType: "monthly",
        periodValue: 1,
        isDefault: true,
        isActive: true,
      },
      {
        id: "c211fef4-88ef-45cc-bfe4-940000000102",
        currency: "CNY",
        price: 29900,
        originalPrice: 39990,
        periodType: "yearly",
        periodValue: 1,
        isDefault: false,
        isActive: true,
      },
    ],
    features: [
      {
        code: "release.versions",
        name: "发布版本",
        type: "function",
        quotaValue: 3,
        isUnlimited: false,
        config: { labels: ["基础版", "专业版", "企业版"] },
      },
      {
        code: "ai.business_agents",
        name: "智能体应用",
        type: "function",
        quotaValue: 1,
        isUnlimited: false,
        config: { includedAgents: ["console-assistant"] },
      },
      {
        code: "ai.token_metering",
        name: "租户模型用量监测",
        type: "function",
        quotaValue: 1,
        isUnlimited: false,
        config: { period: "monthly" },
      },
    ],
    allowedAgents: ["Console 平台智能助手"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "0bb203b6-7dfb-42d8-a6ad-920000000102",
    productCode: "ruyin-cn",
    productName: "Ruyin 国内版",
    productRegion: "domestic",
    productStatus: "active",
    releaseCode: "ruyin-cn-2026-q2",
    releaseName: "2026 Q2 对话验证发布",
    description: "Ruyin 国内版验证发布，先以对话智能体接入产品与模型授权链路。",
    releaseType: "standard",
    versionLabels: ["基础版", "高级版", "定制版"],
    isFree: false,
    isPublic: true,
    isActive: true,
    prices: [
      {
        id: "c211fef4-88ef-45cc-bfe4-940000000201",
        currency: "CNY",
        price: 1999,
        originalPrice: 2999,
        periodType: "monthly",
        periodValue: 1,
        isDefault: true,
        isActive: true,
      },
      {
        id: "c211fef4-88ef-45cc-bfe4-940000000202",
        currency: "CNY",
        price: 19900,
        originalPrice: 29990,
        periodType: "yearly",
        periodValue: 1,
        isDefault: false,
        isActive: true,
      },
    ],
    features: [
      {
        code: "release.versions",
        name: "发布版本",
        type: "function",
        quotaValue: 3,
        isUnlimited: false,
        config: { labels: ["基础版", "高级版", "定制版"] },
      },
      {
        code: "ai.business_agents",
        name: "智能体应用",
        type: "function",
        quotaValue: 1,
        isUnlimited: false,
        config: { includedAgents: ["ruyin"] },
      },
      {
        code: "ai.token_metering",
        name: "租户模型用量监测",
        type: "function",
        quotaValue: 1,
        isUnlimited: false,
        config: { period: "monthly" },
      },
    ],
    allowedAgents: ["Ruyin"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "0bb203b6-7dfb-42d8-a6ad-920000000103",
    productCode: "ruyin-intl",
    productName: "Ruyin 国际版",
    productRegion: "international",
    productStatus: "draft",
    releaseCode: "ruyin-intl-2026-q2-preview",
    releaseName: "2026 Q2 Preview",
    description:
      "Ruyin 国际版预览发布；产品存在但模型策略尚未定义，默认不授权。",
    releaseType: "standard",
    versionLabels: ["Standard", "Pro"],
    isFree: false,
    isPublic: false,
    isActive: false,
    prices: [
      {
        id: "c211fef4-88ef-45cc-bfe4-940000000301",
        currency: "USD",
        price: 399,
        originalPrice: 499,
        periodType: "monthly",
        periodValue: 1,
        isDefault: true,
        isActive: false,
      },
    ],
    features: [
      {
        code: "release.versions",
        name: "发布版本",
        type: "function",
        quotaValue: 2,
        isUnlimited: false,
        config: { labels: ["Standard", "Pro"] },
      },
      {
        code: "ai.business_agents",
        name: "智能体应用",
        type: "function",
        quotaValue: 1,
        isUnlimited: false,
        config: { includedAgents: ["ruyin"] },
      },
    ],
    allowedAgents: ["Ruyin"],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const explicitModelPolicies: ProductModelPolicyRecord[] = [];

export const defaultModelPolicies: ProductModelPolicyRecord[] = [
  {
    id: "policy-default-new-product",
    subjectType: "tenant",
    subjectId: "*",
    subjectName: "租户主体",
    scopeType: "new_product_default",
    scopeCode: NEW_PRODUCT_DEFAULT_CODE,
    scopeName: "新产品授权策略",
    isDefined: false,
    productCode: NEW_PRODUCT_DEFAULT_CODE,
    productName: "新产品默认",
    productRegion: null,
    agentId: null,
    agentCode: null,
    agentName: "全部智能体",
    modelCode: null,
    quotaTokens: 0,
    isUnlimited: false,
    priority: 999,
    isActive: false,
    cycle: "monthly",
    note: "未定义时默认不授权，新产品上线前需要补充产品级策略。",
  },
  {
    id: "policy-default-tenant",
    subjectType: "tenant",
    subjectId: "*",
    subjectName: "租户主体",
    scopeType: "tenant_default",
    scopeCode: TENANT_DEFAULT_CODE,
    scopeName: "按租户授权策略",
    isDefined: false,
    productCode: TENANT_DEFAULT_CODE,
    productName: "租户默认",
    productRegion: null,
    agentId: null,
    agentCode: null,
    agentName: "全部智能体",
    modelCode: null,
    quotaTokens: 0,
    isUnlimited: false,
    priority: 1000,
    isActive: false,
    cycle: "monthly",
    note: "未定义租户覆盖时回落到产品策略；产品策略也未定义时默认不授权。",
  },
];

@Controller("api/products")
export class ProductsRouter {
  constructor(
    @Inject(ADMIN_BFF_RO_POOL) private readonly pool: Pool,
    @Inject(ADMIN_BFF_RW_POOL) private readonly rwPool: Pool,
  ) {}

  @Get("capabilities")
  async listCapabilities(
    @Req() req: Request & RequestContext,
  ): Promise<ProductCapabilityRecord[]> {
    assertCanManageProducts(req);
    return loadProductCapabilities(this.pool);
  }

  @Get("capabilities/:productCode")
  async getCapability(
    @Req() req: Request & RequestContext,
    @Param("productCode") productCode: string,
  ): Promise<ProductCapabilityRecord> {
    assertCanManageProducts(req);
    const normalizedCode = decodeURIComponent(productCode);
    const capability = (await loadProductCapabilities(this.pool)).find(
      (item) => item.productCode === normalizedCode,
    );

    if (!capability) {
      throw new NotFoundException(
        `Product capability ${normalizedCode} not found`,
      );
    }

    return capability;
  }

  @Get("releases")
  listReleases(@Req() req: Request & RequestContext): ProductReleaseRecord[] {
    assertCanManageProducts(req);
    return listProductReleases();
  }

  @Get("plans")
  async listPlans(
    @Req() req: Request & RequestContext,
  ): Promise<ProductPlanRecord[]> {
    assertCanManageProducts(req);

    const planRows = await this.pool.query<ProductPlanRow>(PRODUCT_PLAN_SQL);

    // Versioned model (§7): a plan is browsed via its current published
    // plan_version (single price). The old per-plan relational feature/agent
    // breakdown is gone (features live on plan_component); the rich component/tier
    // browse belongs to the new versioned-plan admin surface, so features/agents
    // are empty here — this endpoint stays runtime-correct against the new schema.
    return planRows.rows.map((plan) => {
      const price = plan.price === null ? 0 : Number(plan.price);
      return {
        id: plan.id,
        planCode: plan.plan_code,
        planName: plan.plan_name,
        description: plan.description,
        planType: "normal",
        level: 0,
        isFree: price === 0,
        isPublic: plan.is_public,
        isActive: plan.status === "active",
        subscriptionCount: Number(plan.subscription_count),
        prices:
          plan.current_version_id === null
            ? []
            : [
                {
                  id: plan.current_version_id,
                  currency: plan.currency ?? "CNY",
                  price,
                  originalPrice: price,
                  periodType: "monthly" as const,
                  periodValue: 1,
                  isDefault: true,
                  isActive: plan.version_status === "published",
                },
              ],
        features: [],
        agents: [],
        createdAt: toIso(plan.created_at),
        updatedAt: toIso(plan.updated_at),
      };
    });
  }

  @Get("solutions")
  listSolutions(@Req() req: Request & RequestContext): ProductSolutionRecord[] {
    assertCanManageProducts(req);
    return listProductSolutions();
  }

  @Get("solutions/:solutionCode")
  getSolution(
    @Req() req: Request & RequestContext,
    @Param("solutionCode") solutionCode: string,
  ): ProductSolutionDetailRecord {
    assertCanManageProducts(req);
    return getProductSolutionDetail(decodeURIComponent(solutionCode));
  }

  @Get("service-plans/:solutionCode/:tierCode")
  getServicePlan(
    @Req() req: Request & RequestContext,
    @Param("solutionCode") solutionCode: string,
    @Param("tierCode") tierCode: ProductSolutionTierCode,
  ): ProductServicePlanDetailRecord {
    assertCanManageProducts(req);
    return getProductServicePlanDetail(
      decodeURIComponent(solutionCode),
      decodeURIComponent(tierCode) as ProductSolutionTierCode,
    );
  }

  @Get("agents")
  async listAgents(
    @Req() req: Request & RequestContext,
  ): Promise<ProductAgentRecord[]> {
    assertCanManageProducts(req);
    return loadProductAgents(this.pool);
  }

  @Get("model-policies")
  listModelPolicies(
    @Req() req: Request & RequestContext,
  ): ProductModelPolicyRecord[] {
    assertCanManageProducts(req);
    return listEffectiveModelPolicies();
  }

  // ── plan version lifecycle (product_320) — list · edit draft · publish ─────
  // draft = editable working copy (unlocked, never current); publish freezes it
  // (is_locked=true) and points plans.current_version_id at it. §7 triggers make
  // components/prices immutable once locked, so edits are draft-only.

  @Get("plans/:planId/versions")
  async listPlanVersions(
    @Req() req: Request & RequestContext,
    @Param("planId") planId: string,
  ): Promise<PlanVersionSummary[]> {
    assertCanManageProducts(req);
    const { rows } = await this.pool.query<PlanVersionSummaryRow>(
      PLAN_VERSIONS_SQL,
      [planId],
    );
    return rows.map(mapPlanVersionSummary);
  }

  @Get("plan-versions/:versionId")
  async getPlanVersion(
    @Req() req: Request & RequestContext,
    @Param("versionId") versionId: string,
  ): Promise<PlanVersionDetail> {
    assertCanManageProducts(req);
    return loadPlanVersionDetail(this.pool, versionId);
  }

  @Patch("plan-versions/:versionId")
  async updateDraftVersion(
    @Req() req: Request & RequestContext,
    @Param("versionId") versionId: string,
    @Body() body: UpdateDraftVersionInput,
  ): Promise<PlanVersionDetail> {
    assertCanManageProducts(req);
    const client = await this.rwPool.connect();
    try {
      await client.query("BEGIN");
      const cur = await client.query<{ status: string; is_locked: boolean }>(
        `SELECT status, is_locked FROM product.plan_versions WHERE id = $1 FOR UPDATE`,
        [versionId],
      );
      const row = cur.rows[0];
      if (!row) {
        throw new NotFoundException(`Plan version ${versionId} not found`);
      }
      if (row.status !== "draft" || row.is_locked) {
        throw new BadRequestException(
          "Only an unpublished draft version can be edited",
        );
      }
      if (Array.isArray(body.prices)) {
        for (const p of body.prices) {
          const cycle = p.cycleUnit;
          if (cycle !== "month" && cycle !== "year") {
            throw new BadRequestException(
              `Invalid cycleUnit: ${String(cycle)}`,
            );
          }
          const price = Number(p.price);
          if (!Number.isFinite(price) || price < 0) {
            throw new BadRequestException(`Invalid price for ${cycle}`);
          }
          await client.query(
            `INSERT INTO product.plan_prices
               (id, plan_version_id, cycle_unit, cycle_count, price, currency, created_at)
             VALUES (gen_random_uuid(), $1, $2, 1, $3, 'CNY', now())
             ON CONFLICT (plan_version_id, cycle_unit, cycle_count, currency)
             DO UPDATE SET price = EXCLUDED.price`,
            [versionId, cycle, price],
          );
        }
      }
      if (body.quota && typeof body.quota === "object") {
        await client.query(
          `UPDATE product.plan_components SET quota = $2::jsonb
            WHERE plan_version_id = $1 AND component_role = 'primary'`,
          [versionId, JSON.stringify(body.quota)],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return loadPlanVersionDetail(this.pool, versionId);
  }

  @Post("plan-versions/:versionId/publish")
  @RequireStepUp()
  async publishPlanVersion(
    @Req() req: Request & RequestContext,
    @Param("versionId") versionId: string,
  ): Promise<{ published: true; versionId: string }> {
    assertCanManageProducts(req);
    const client = await this.rwPool.connect();
    try {
      await client.query("BEGIN");
      const cur = await client.query<{ plan_id: string; status: string }>(
        `SELECT plan_id, status FROM product.plan_versions WHERE id = $1 FOR UPDATE`,
        [versionId],
      );
      const row = cur.rows[0];
      if (!row) {
        throw new NotFoundException(`Plan version ${versionId} not found`);
      }
      if (row.status === "published") {
        throw new BadRequestException("Version is already published");
      }
      // publish: freeze the version and make it the plan's live version. A
      // prior published version stays 'published' (subscriptions pinned to it
      // keep resolving) — it just stops being current.
      await client.query(
        `UPDATE product.plan_versions SET status = 'published', is_locked = true WHERE id = $1`,
        [versionId],
      );
      await client.query(
        `UPDATE product.plans SET current_version_id = $2, updated_at = now() WHERE id = $1`,
        [row.plan_id, versionId],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return { published: true, versionId };
  }
}

// ── plan version lifecycle: types · SQL · loaders (product_320) ─────────────

interface PlanVersionPrice {
  cycleUnit: string;
  price: string;
}

interface PlanVersionSummary {
  id: string;
  versionNo: number;
  status: string;
  isLocked: boolean;
  isCurrent: boolean;
  prices: PlanVersionPrice[];
}

interface PlanVersionDetail extends PlanVersionSummary {
  planId: string;
  planCode: string;
  planName: string;
  quota: Record<string, unknown>;
}

interface UpdateDraftVersionInput {
  prices?: { cycleUnit?: unknown; price?: unknown }[];
  quota?: Record<string, unknown>;
}

interface PlanVersionSummaryRow {
  id: string;
  version_no: number;
  status: string;
  is_locked: boolean;
  is_current: boolean;
  prices: PlanVersionPrice[];
}

const PLAN_VERSIONS_SQL = `
  SELECT pv.id, pv.version_no, pv.status, pv.is_locked,
         (pv.id = p.current_version_id) AS is_current,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object('cycleUnit', pp.cycle_unit, 'price', to_char(pp.price, 'FM999999999990.00'))
                            ORDER BY pp.cycle_unit)
             FROM product.plan_prices pp WHERE pp.plan_version_id = pv.id
         ), '[]'::jsonb) AS prices
    FROM product.plan_versions pv
    JOIN product.plans p ON p.id = pv.plan_id
   WHERE pv.plan_id = $1
   ORDER BY pv.version_no ASC
`;

function mapPlanVersionSummary(row: PlanVersionSummaryRow): PlanVersionSummary {
  return {
    id: row.id,
    versionNo: row.version_no,
    status: row.status,
    isLocked: row.is_locked,
    isCurrent: row.is_current,
    prices: row.prices ?? [],
  };
}

async function loadPlanVersionDetail(
  pool: Pool,
  versionId: string,
): Promise<PlanVersionDetail> {
  const { rows } = await pool.query<
    PlanVersionSummaryRow & {
      plan_id: string;
      plan_code: string;
      plan_name: string;
      quota: Record<string, unknown> | null;
    }
  >(
    `SELECT pv.id, pv.plan_id, pv.version_no, pv.status, pv.is_locked,
            (pv.id = p.current_version_id) AS is_current,
            p.plan_code, p.plan_name,
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('cycleUnit', pp.cycle_unit, 'price', to_char(pp.price, 'FM999999999990.00'))
                               ORDER BY pp.cycle_unit)
                FROM product.plan_prices pp WHERE pp.plan_version_id = pv.id
            ), '[]'::jsonb) AS prices,
            (SELECT pc.quota FROM product.plan_components pc
              WHERE pc.plan_version_id = pv.id AND pc.component_role = 'primary' LIMIT 1) AS quota
       FROM product.plan_versions pv
       JOIN product.plans p ON p.id = pv.plan_id
      WHERE pv.id = $1`,
    [versionId],
  );
  const row = rows[0];
  if (!row) {
    throw new NotFoundException(`Plan version ${versionId} not found`);
  }
  return {
    ...mapPlanVersionSummary(row),
    planId: row.plan_id,
    planCode: row.plan_code,
    planName: row.plan_name,
    quota: row.quota ?? {},
  };
}

// ── C14 de-mock: product catalog capabilities + agents read from the live
//   `product` schema (product.products is the unified SoT — merged agent +
//   application). Only these two endpoints have real backing tables; solutions /
//   service-plans / releases / model-policies remain mock (no schema — see the
//   注释 above listProductSolutions / listProductReleases / listEffectiveModelPolicies).

/** Raw product.products row (+ derived plan_count / category_code) for the catalog list. */
interface ProductCatalogRow {
  id: string;
  product_code: string;
  product_type: string; // client | external | agent | data_platform | platform | …
  product_name: string;
  description: string | null;
  status: string; // active | inactive | draft | deprecated
  is_customer_visible: boolean;
  is_workforce_visible: boolean;
  tags: string[];
  category_code: string | null;
  plan_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProductMetricRow {
  product_id: string;
  metric_key: string;
  metric_unit: string | null;
  reset_period: string;
  merge_strategy: string;
}

interface ProductWebhookRow {
  product_id: string;
  webhook_url: string | null;
}

/** Map the open-ended product_type kind onto the capability presentation type. */
function mapProductCapabilityType(productType: string): ProductCapabilityType {
  switch (productType) {
    case "agent":
      return "agent";
    case "model":
      return "model";
    case "data_platform":
    case "data":
      return "data";
    case "platform":
      return "platform";
    // client / external / anything else present as an integrated service.
    default:
      return "service";
  }
}

/** Project the DDL status (active|inactive|draft|deprecated) onto the 3-state capability status. */
function mapProductCapabilityStatus(status: string): ProductCapabilityStatus {
  if (status === "active") return "active";
  if (status === "draft") return "draft";
  return "archived"; // inactive | deprecated
}

const PRODUCT_CATALOG_SQL = `
  SELECT
    p.id,
    p.product_code,
    p.product_type,
    p.product_name,
    p.description,
    p.status,
    p.is_customer_visible,
    p.is_workforce_visible,
    p.tags,
    c.code AS category_code,
    (SELECT COUNT(DISTINCT pv.plan_id)::int
       FROM product.plan_components comp
       JOIN product.plan_versions pv ON pv.id = comp.plan_version_id
      WHERE comp.product_id = p.id) AS plan_count,
    p.created_at,
    p.updated_at
  FROM product.products p
  LEFT JOIN product.product_categories c ON c.id = p.category_id
  WHERE p.deleted_at IS NULL
  ORDER BY (p.status = 'active') DESC, p.product_name ASC
`;

/**
 * Load the product-capability catalog from the live product schema. Fields with
 * no schema home (ownerTeam / accessModes / billingMode / relatedSolutions /
 * releases / modelPolicyCount) are returned empty rather than fabricated — the
 * rich solutions/releases model is not yet defined (C14 owner scope 2026-07-12).
 */
export async function loadProductCapabilities(
  pool: Pool,
): Promise<ProductCapabilityRecord[]> {
  const [products, metrics, webhooks] = await Promise.all([
    pool.query<ProductCatalogRow>(PRODUCT_CATALOG_SQL),
    pool.query<ProductMetricRow>(
      `SELECT product_id, metric_key, metric_unit, reset_period, merge_strategy
         FROM product.product_metrics`,
    ),
    pool.query<ProductWebhookRow>(
      `SELECT product_id, webhook_url FROM product.product_webhooks`,
    ),
  ]);

  const metricsByProduct = new Map<string, ProductCapabilityMetricRule[]>();
  for (const metric of metrics.rows) {
    const list = metricsByProduct.get(metric.product_id) ?? [];
    list.push({
      metricCode: metric.metric_key,
      metricName: metric.metric_key,
      unit: metric.metric_unit ?? "",
      cycle: metric.reset_period,
      quotaBase: metric.merge_strategy,
      billingMode: metric.merge_strategy === "pool" ? "配额池扣减" : "能力包含",
    });
    metricsByProduct.set(metric.product_id, list);
  }

  const webhookByProduct = new Map<string, ProductWebhookRow>();
  for (const webhook of webhooks.rows) {
    webhookByProduct.set(webhook.product_id, webhook);
  }

  return products.rows.map((row) => {
    const productType = mapProductCapabilityType(row.product_type);
    const status = mapProductCapabilityStatus(row.status);
    const source: ProductCapabilitySource =
      row.product_type === "external" ? "partner" : "self";
    const productMetrics = metricsByProduct.get(row.id) ?? [];
    const webhook = webhookByProduct.get(row.id);
    const integration: ProductCapabilityIntegration = webhook
      ? {
          providerName: source === "partner" ? "合作方服务商" : "Vxture",
          providerType: source,
          status: webhook.webhook_url ? "connected" : "config_required",
          endpoint: webhook.webhook_url,
          protocol: "REST / HTTPS",
          authMode: "HMAC 自签",
          settlementMode: source === "partner" ? "按合同结算" : null,
          lastCheckedAt: null,
        }
      : {
          providerName: source === "partner" ? "合作方服务商" : "Vxture",
          providerType: source,
          status: "not_required",
          endpoint: null,
          protocol: "内部服务",
          authMode: "平台会话",
          settlementMode: null,
          lastCheckedAt: null,
        };

    return {
      id: row.id,
      productCode: row.product_code,
      productName: row.product_name,
      description: row.description ?? "",
      productType,
      source,
      status,
      visibility: row.is_customer_visible ? "public" : "internal",
      region: "global",
      ownerTeam: "",
      capabilitySummary: row.description ?? "",
      accessModes: [],
      tags: row.tags ?? [],
      meteringUnit: productMetrics[0]?.unit ?? "",
      billingMode: "",
      healthStatus:
        status === "active"
          ? "normal"
          : status === "draft"
            ? "warning"
            : "disabled",
      integration,
      metrics: productMetrics,
      relatedSolutions: [],
      releases: [],
      solutionCount: 0,
      planCount: Number(row.plan_count) || 0,
      releaseCount: 0,
      modelPolicyCount: 0,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    };
  });
}

/** Agent-kind products from the live catalog (product_type = 'agent'). */
export async function loadProductAgents(
  pool: Pool,
): Promise<ProductAgentRecord[]> {
  const rows = await pool.query<
    Pick<
      ProductCatalogRow,
      | "id"
      | "product_code"
      | "product_name"
      | "description"
      | "status"
      | "is_customer_visible"
      | "is_workforce_visible"
      | "created_at"
      | "updated_at"
    >
  >(
    `SELECT id, product_code, product_name, description, status,
            is_customer_visible, is_workforce_visible, created_at, updated_at
       FROM product.products
      WHERE deleted_at IS NULL AND product_type = 'agent'
      ORDER BY product_name ASC`,
  );

  return rows.rows.map((row) => ({
    id: row.id,
    agentCode: row.product_code,
    agentName: row.product_name,
    description: row.description ?? "",
    // agentType / defaultModelCode have no product-schema column — the versioned
    // agent-config model is not yet defined; default to chat / unbound.
    agentType: "chat" as const,
    status:
      row.status === "active" ? ("active" as const) : ("inactive" as const),
    visibility: row.is_customer_visible
      ? ("public" as const)
      : row.is_workforce_visible
        ? ("internal" as const)
        : ("private" as const),
    defaultModelCode: null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }));
}

// STILL MOCK (no schema backing). solutions / service-plans / releases /
// model-policies have no `product`-schema tables — the industry-solution and
// release-packaging models are not yet defined. De-mocking these is blocked on
// product-catalog design (owner scope 2026-07-12: C14 = capabilities + agents
// only; the rest registered as TD, see docs tech-debt). Do NOT wire these to the
// live DB without the tables + owner sign-off.
export function listProductReleases(): ProductReleaseRecord[] {
  return productReleases;
}

// STILL MOCK — see the note above listProductReleases (no product.solutions table).
export function listProductSolutions(): ProductSolutionRecord[] {
  return productSolutions;
}

export function getProductSolutionDetail(
  solutionCode: string,
): ProductSolutionDetailRecord {
  const solution = productSolutions.find(
    (item) => item.solutionCode === solutionCode,
  );
  if (!solution) {
    throw new NotFoundException(`Product solution ${solutionCode} not found`);
  }

  return {
    ...solution,
    deliveryMode: deliveryModeForSolution(solution),
    deliveryBoundaries: deliveryBoundariesForSolution(solution),
    relatedServicePlans: solution.tiers.map(mapSolutionServicePlanSummary),
  };
}

export function getProductServicePlanDetail(
  solutionCode: string,
  tierCode: ProductSolutionTierCode,
): ProductServicePlanDetailRecord {
  const solution = productSolutions.find(
    (item) => item.solutionCode === solutionCode,
  );
  if (!solution) {
    throw new NotFoundException(`Product solution ${solutionCode} not found`);
  }

  const tier = solution.tiers.find((item) => item.tierCode === tierCode);
  if (!tier) {
    throw new NotFoundException(
      `Service plan ${solutionCode}/${tierCode} not found`,
    );
  }

  const price = priceForTier(tier);
  const entitlements = solution.products.map((product) =>
    entitlementFor(solution.solutionCode, tier.tierCode, product),
  );

  return {
    id: `${solution.id}:${tier.tierCode}`,
    solutionCode: solution.solutionCode,
    solutionName: solution.solutionName,
    industry: solution.industry,
    scenario: solution.scenario,
    customerSegment: solution.customerSegment,
    ownerTeam: solution.ownerTeam,
    tierCode: tier.tierCode,
    tierName: tier.tierName,
    summary: tier.summary,
    status: tier.status,
    isPublic: tier.isPublic,
    price,
    subscriptionCount: Math.max(
      0,
      Math.round(
        solution.subscriptionCount * subscriptionRatioForTier(tier.tierCode),
      ),
    ),
    activeTenantCount: Math.max(
      0,
      Math.round(
        solution.activeTenantCount * subscriptionRatioForTier(tier.tierCode),
      ),
    ),
    deliveryMode: deliveryModeForSolution(solution),
    applicableScope: applicableScopeForTier(solution, tier),
    salesNotes: salesNotesForTier(tier),
    entitlements,
    includedProductCount: entitlements.filter((item) => item.included).length,
    excludedProductCount: entitlements.filter((item) => !item.included).length,
    createdAt: solution.createdAt,
    updatedAt: solution.updatedAt,
  };
}

function mapSolutionServicePlanSummary(
  tier: ProductSolutionTier,
): ProductSolutionServicePlanSummary {
  return {
    tierCode: tier.tierCode,
    tierName: tier.tierName,
    summary: tier.summary,
    status: tier.status,
    isPublic: tier.isPublic,
    priceLabel: priceForTier(tier).priceLabel,
  };
}

function deliveryModeForSolution(solution: ProductSolutionRecord): string {
  if (solution.solutionCode === "flood-regulation")
    return "平台订阅 + 三方设备/模型接入 + 行业实施服务";
  if (solution.solutionCode === "smart-legal")
    return "平台订阅 + 知识库初始化 + 法务场景配置";
  if (solution.solutionCode === "emergency-command")
    return "专属项目交付 + 多系统接口联调";
  return "平台订阅 + 行业方案配置";
}

function deliveryBoundariesForSolution(
  solution: ProductSolutionRecord,
): string[] {
  if (solution.solutionCode === "flood-regulation") {
    return [
      "覆盖无人机巡检任务、视频解译、灾情调度、数据管理和报告编制业务闭环。",
      "无人机设备采购、现场飞手服务和第三方网络链路不默认包含，按合同另行约定。",
      "视频解译模型输出作为辅助研判结果，正式处置结论需由客户业务人员确认。",
    ];
  }

  if (solution.solutionCode === "smart-legal") {
    return [
      "覆盖法规知识库、合同审查、法律问答和报告编制等企业法务辅助场景。",
      "历史文档清洗、专属法规库采购和外部律师服务不默认包含。",
      "智能体输出不作为正式法律意见，需经客户法务或律师审核确认。",
    ];
  }

  return [
    "覆盖方案内产品能力的开通、配置、订阅和用量计量。",
    "外部系统接口、现场部署和专属模型调优按合同另行确认。",
    "方案当前处于草稿或灰度阶段时，不承诺公开售卖 SLA。",
  ];
}

function priceForTier(tier: ProductSolutionTier): ProductServicePlanPrice {
  if (tier.tierCode === "free") {
    return {
      priceLabel: "免费",
      price: 0,
      originalPrice: 0,
      currency: "CNY",
      periodType: "monthly",
      periodValue: 1,
    };
  }

  const plan = productPlanByCode(tierPlanCodeMap[tier.tierCode]);
  const defaultPrice =
    plan?.prices.find((price) => price.isDefault && price.isActive) ??
    plan?.prices.find((price) => price.isActive) ??
    plan?.prices[0];
  if (defaultPrice && tier.tierCode === "pro") {
    return {
      priceLabel: `${formatCurrency(Number(defaultPrice.price), defaultPrice.currency)} / ${defaultPrice.periodType === "yearly" ? "年" : "月"}`,
      price: Number(defaultPrice.price),
      originalPrice: Number(defaultPrice.originalPrice),
      currency: defaultPrice.currency,
      periodType: defaultPrice.periodType,
      periodValue: defaultPrice.periodValue,
    };
  }

  return {
    priceLabel: "合同报价",
    price: null,
    originalPrice: null,
    currency: "CNY",
    periodType: "contract",
    periodValue: 1,
  };
}

function productPlanByCode(planCode: string): ProductPlanRecord | null {
  const fallback = planFallbacks[planCode];
  if (!fallback) return null;
  return fallback;
}

const planFallbacks: Record<string, ProductPlanRecord> = {
  starter: {
    id: "plan-fallback-starter",
    planCode: "starter",
    planName: "入门版",
    description: "适合个人或小团队试用。",
    planType: "normal",
    level: 10,
    isFree: true,
    isPublic: true,
    isActive: true,
    subscriptionCount: 0,
    prices: [
      {
        id: "price-starter",
        currency: "CNY",
        price: 0,
        originalPrice: 0,
        periodType: "monthly",
        periodValue: 1,
        isDefault: true,
        isActive: true,
      },
    ],
    features: [],
    agents: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  growth: {
    id: "plan-fallback-growth",
    planCode: "growth",
    planName: "专业版",
    description: "适合组织客户使用。",
    planType: "normal",
    level: 20,
    isFree: false,
    isPublic: true,
    isActive: true,
    subscriptionCount: 0,
    prices: [
      {
        id: "price-growth",
        currency: "CNY",
        price: 2999,
        originalPrice: 3999,
        periodType: "monthly",
        periodValue: 1,
        isDefault: true,
        isActive: true,
      },
    ],
    features: [],
    agents: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  enterprise: {
    id: "plan-fallback-enterprise",
    planCode: "enterprise",
    planName: "企业版",
    description: "适合专属交付和合同方案。",
    planType: "normal",
    level: 30,
    isFree: false,
    isPublic: true,
    isActive: true,
    subscriptionCount: 0,
    prices: [
      {
        id: "price-enterprise",
        currency: "CNY",
        price: 9999,
        originalPrice: 12999,
        periodType: "monthly",
        periodValue: 1,
        isDefault: true,
        isActive: true,
      },
    ],
    features: [],
    agents: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
};

function formatCurrency(value: number, currency: string): string {
  if (currency === "CNY")
    return `¥${new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  return `${currency} ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

function entitlementFor(
  solutionCode: string,
  tierCode: ProductSolutionTierCode,
  product: ProductSolutionRecord["products"][number],
): ProductServicePlanEntitlement {
  const key = `${solutionCode}:${tierCode}:${product.productCode}`;
  const override = entitlementOverrides[key];
  if (override) {
    return { ...product, ...override };
  }

  if (tierCode === "enterprise" || tierCode === "custom") {
    return {
      ...product,
      included: true,
      quotaSummary: "合同约定",
      note: "按客户规模、接口和交付范围确认。",
    };
  }

  if (tierCode === "free") {
    return {
      ...product,
      included: true,
      quotaSummary: "基础试用额度",
      note: "仅用于试用验证，不承诺生产 SLA。",
    };
  }

  return {
    ...product,
    included: true,
    quotaSummary: "标准专业版额度",
    note: "适合正式生产使用，可按套餐规则扩容。",
  };
}

const entitlementOverrides: Record<
  string,
  Pick<ProductServicePlanEntitlement, "included" | "quotaSummary" | "note">
> = {
  "flood-regulation:free:drone-platform": {
    included: true,
    quotaSummary: "1 台无人机",
    note: "支持单设备试用接入。",
  },
  "flood-regulation:free:flood-video-interpretation": {
    included: true,
    quotaSummary: "1 路视频解译",
    note: "用于单路视频验证。",
  },
  "flood-regulation:free:report-author-agent": {
    included: false,
    quotaSummary: "不包含",
    note: "报告编制从 Pro 开始开放。",
  },
  "flood-regulation:pro:drone-platform": {
    included: true,
    quotaSummary: "50 台无人机",
    note: "支持组织级巡检任务。",
  },
  "flood-regulation:pro:flood-video-interpretation": {
    included: true,
    quotaSummary: "50 路视频解译",
    note: "支持多点位视频分析。",
  },
  "flood-regulation:pro:report-author-agent": {
    included: true,
    quotaSummary: "100 万字/年",
    note: "用于巡检报告和处置简报。",
  },
  "smart-legal:free:report-author-agent": {
    included: true,
    quotaSummary: "100 万字/年",
    note: "适合轻量报告生成。",
  },
  "smart-legal:free:legal-knowledge-base": {
    included: true,
    quotaSummary: "基础存储空间",
    note: "适合少量法规和合同材料。",
  },
  "smart-legal:free:contract-review": {
    included: false,
    quotaSummary: "不包含",
    note: "合同审核从 Pro 开始开放。",
  },
  "smart-legal:free:legal-retrieval-model": {
    included: false,
    quotaSummary: "不包含",
    note: "高级法规检索从 Pro 开始开放。",
  },
  "smart-legal:pro:report-author-agent": {
    included: true,
    quotaSummary: "1000 万字/年",
    note: "支持组织级报告编制。",
  },
  "smart-legal:pro:legal-knowledge-base": {
    included: true,
    quotaSummary: "扩展存储空间",
    note: "支持多部门知识库。",
  },
  "smart-legal:pro:contract-review": {
    included: true,
    quotaSummary: "高级合同审查",
    note: "支持合同条款抽取和风险提示。",
  },
  "smart-legal:pro:legal-retrieval-model": {
    included: true,
    quotaSummary: "高级检索额度",
    note: "支持法规语义检索。",
  },
};

function applicableScopeForTier(
  solution: ProductSolutionRecord,
  tier: ProductSolutionTier,
): string[] {
  if (tier.tierCode === "free") {
    return ["试用客户", "POC 验证", `${solution.scenario} 单场景验证`];
  }
  if (tier.tierCode === "pro") {
    return [
      "正式订阅客户",
      "组织级生产使用",
      `${solution.industry} 标准业务团队`,
    ];
  }
  return [
    "大型组织客户",
    "专属合同客户",
    "需要私有部署、接口联调或现场交付的客户",
  ];
}

function salesNotesForTier(tier: ProductSolutionTier): string[] {
  if (tier.tierCode === "free")
    return [
      "默认公开可见。",
      "不包含专属实施和现场服务。",
      "可升级到 Pro 或 Enterprise。",
    ];
  if (tier.tierCode === "pro")
    return [
      "标准售卖版本。",
      "支持套餐内配额和超额扩容。",
      "可配置优惠活动和年度价格。",
    ];
  return [
    "按合同报价。",
    "支持专属交付边界、私有模型和接口联调。",
    "售卖前需要运营和交付团队复核。",
  ];
}

function subscriptionRatioForTier(tierCode: ProductSolutionTierCode): number {
  if (tierCode === "free") return 0.35;
  if (tierCode === "pro") return 0.5;
  return 0.15;
}

function toIso(value: Date | string | null): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

// STILL MOCK — model authorization policies belong to the model platform (B11,
// deferred); this returns "undefined → default deny" placeholders. See the note
// above listProductReleases.
export function listEffectiveModelPolicies(): ProductModelPolicyRecord[] {
  const rows = [...explicitModelPolicies, ...defaultModelPolicies];
  const definedProductCodes = new Set(
    explicitModelPolicies.map((policy) => policy.productCode),
  );

  for (const release of productReleases) {
    if (definedProductCodes.has(release.productCode)) continue;

    rows.push({
      id: `policy-undefined-${release.productCode}`,
      subjectType: "tenant",
      subjectId: "*",
      subjectName: "租户主体",
      scopeType: "product",
      scopeCode: release.productCode,
      scopeName: release.productName,
      isDefined: false,
      productCode: release.productCode,
      productName: release.productName,
      productRegion: release.productRegion,
      agentId: null,
      agentCode: null,
      agentName: "全部智能体",
      modelCode: null,
      quotaTokens: 0,
      isUnlimited: false,
      priority: 999,
      isActive: false,
      cycle: "monthly",
      note: "产品已发布但模型策略未定义，默认不授权。",
    });
  }

  return rows;
}

function assertCanManageProducts(req: Request & RequestContext): void {
  if (!req.user) {
    throw new UnauthorizedException("No active session");
  }

  if (
    !req.capabilities ||
    !req.capabilities.includes("platform.product.manage")
  ) {
    throw new ForbiddenException("Missing platform.product.manage capability");
  }
}

interface ProductPlanRow {
  id: string;
  plan_code: string;
  plan_name: string;
  description: string;
  is_public: boolean;
  status: string; // active | inactive | draft | deprecated
  current_version_id: string | null;
  price: string | number | null; // from current published plan_version
  currency: string | null;
  version_status: string | null; // draft | published
  subscription_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

const PRODUCT_PLAN_SQL = `
  SELECT
    p.id,
    p.plan_code,
    p.plan_name,
    COALESCE(p.description, '') AS description,
    p.is_public,
    p.status,
    p.current_version_id,
    pp.price,
    pp.currency,
    -- plan_versions dropped the draft/published status column; the version that
    -- plans.current_version_id points at is the live/published one by definition.
    CASE WHEN pv.id IS NOT NULL THEN 'published' ELSE 'draft' END AS version_status,
    p.created_at,
    p.updated_at,
    (SELECT COUNT(*)::int
       FROM metering.subscriptions s
       JOIN product.plan_versions pv2 ON pv2.id = s.plan_version_id
      WHERE pv2.plan_id = p.id AND s.deleted_at IS NULL) AS subscription_count
  FROM product.plans p
  LEFT JOIN product.plan_versions pv ON pv.id = p.current_version_id
  -- price/currency moved from the old inline plan_version columns to the new
  -- per-cycle product.plan_prices table; pick the monthly cycle to preserve the
  -- single-price shape this endpoint projects (periodType is hardcoded monthly).
  LEFT JOIN LATERAL (
    SELECT price, currency
      FROM product.plan_prices
     WHERE plan_version_id = pv.id
     ORDER BY CASE cycle_unit WHEN 'month' THEN 0 ELSE 1 END, cycle_count ASC
     LIMIT 1
  ) pp ON true
  WHERE p.deleted_at IS NULL
  ORDER BY p.plan_code ASC
`;
