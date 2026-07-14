import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { MODEL_PG_POOL } from "../tokens";
import type {
  ModelProviderRecord,
  ModelDefinitionRecord,
  ModelGrantRecord,
  ModelPriceRuleRecord,
  ModelPolicyRecord,
  ListProvidersParams,
  ListModelsParams,
  ListGrantsParams,
  ListPriceRulesParams,
  ListPoliciesParams,
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
  CreateGrantInput,
  CreatePriceRuleInput,
  UpsertPolicyInput,
} from "../types/model.types";

interface ProviderRow {
  id: string;
  provider_code: string;
  provider_type: string;
  provider_name: string;
  description: string | null;
  logo_url: string | null;
  homepage_url: string | null;
  console_url: string | null;
  billing_url: string | null;
  is_active: boolean;
  config: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
interface ModelRow {
  id: string;
  provider_id: string | null;
  model_code: string;
  provider: string;
  model_type: string;
  protocol: string;
  model_name: string;
  description: string | null;
  endpoint_url: string;
  context_window: number | null;
  max_output_tokens: number | null;
  capabilities: string[];
  supports_streaming: boolean;
  is_active: boolean;
  sort: number;
  config: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
interface GrantRow {
  id: string;
  model_id: string;
  tenant_id: string;
  agent_id: string | null;
  priority: number;
  is_active: boolean;
  reason: string | null;
  expires_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
interface PriceRuleRow {
  id: string;
  model_id: string;
  billing_mode: string;
  currency: string;
  unit_tokens: number;
  input_unit_price: string;
  output_unit_price: string;
  request_unit_price: string;
  is_active: boolean;
  effective_at: Date;
  expires_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}
interface PolicyRow {
  id: string;
  model_id: string;
  tenant_id: string | null;
  name: string | null;
  priority: number;
  max_concurrent: number | null;
  rate_limit_rpm: number | null;
  rate_limit_tpm: bigint | null;
  rate_limit_tpd: bigint | null;
  max_context_tokens: number | null;
  is_active: boolean;
  effective_at: Date;
  expires_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PgModelRepository {
  constructor(@Inject(MODEL_PG_POOL) private readonly pool: Pool) {}

  // ── Providers ──────────────────────────────────────────────────────────

  async listProviders(
    params: ListProvidersParams,
  ): Promise<ModelProviderRecord[]> {
    const conditions: string[] = ["deleted_at is null"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(params.isActive);
    }
    if (params.providerType) {
      conditions.push(`provider_type = $${idx++}`);
      values.push(params.providerType);
    }

    const result = await this.pool.query<ProviderRow>(
      `select * from model.model_providers where ${conditions.join(" and ")} order by provider_code asc`,
      values,
    );
    return result.rows.map(this.mapProvider);
  }

  async getProviderById(id: string): Promise<ModelProviderRecord | null> {
    const result = await this.pool.query<ProviderRow>(
      `select * from model.model_providers where id = $1 and deleted_at is null limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapProvider(row) : null;
  }

  async getProviderByCode(
    providerCode: string,
  ): Promise<ModelProviderRecord | null> {
    const result = await this.pool.query<ProviderRow>(
      `select * from model.model_providers where provider_code = $1 and deleted_at is null limit 1`,
      [providerCode],
    );
    const row = result.rows[0];
    return row ? this.mapProvider(row) : null;
  }

  async createProvider(
    input: CreateProviderInput,
  ): Promise<ModelProviderRecord> {
    const result = await this.pool.query<ProviderRow>(
      `insert into model.model_providers (
        provider_code, provider_type, provider_name, description, logo_url,
        homepage_url, console_url, billing_url, config, created_by, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now()) returning *`,
      [
        input.providerCode,
        input.providerType ?? "online",
        input.providerName,
        input.description ?? null,
        input.logoUrl ?? null,
        input.homepageUrl ?? null,
        input.consoleUrl ?? null,
        input.billingUrl ?? null,
        input.config ? JSON.stringify(input.config) : null,
        input.createdBy ?? null,
      ],
    );
    return this.mapProvider(result.rows[0]!);
  }

  async updateProvider(
    id: string,
    input: UpdateProviderInput,
  ): Promise<ModelProviderRecord | null> {
    const sets: string[] = ["updated_at = now()"];
    const values: unknown[] = [];
    let idx = 1;

    if (input.providerName !== undefined) {
      sets.push(`provider_name = $${idx++}`);
      values.push(input.providerName);
    }
    if (input.description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(input.description);
    }
    if (input.logoUrl !== undefined) {
      sets.push(`logo_url = $${idx++}`);
      values.push(input.logoUrl);
    }
    if (input.homepageUrl !== undefined) {
      sets.push(`homepage_url = $${idx++}`);
      values.push(input.homepageUrl);
    }
    if (input.consoleUrl !== undefined) {
      sets.push(`console_url = $${idx++}`);
      values.push(input.consoleUrl);
    }
    if (input.billingUrl !== undefined) {
      sets.push(`billing_url = $${idx++}`);
      values.push(input.billingUrl);
    }
    if (input.isActive !== undefined) {
      sets.push(`is_active = $${idx++}`);
      values.push(input.isActive);
    }
    if (input.config !== undefined) {
      sets.push(`config = $${idx++}`);
      values.push(JSON.stringify(input.config));
    }
    if (input.updatedBy !== undefined) {
      sets.push(`updated_by = $${idx++}`);
      values.push(input.updatedBy);
    }

    values.push(id);
    const result = await this.pool.query<ProviderRow>(
      `update model.model_providers set ${sets.join(", ")} where id = $${idx} and deleted_at is null returning *`,
      values,
    );
    const row = result.rows[0];
    return row ? this.mapProvider(row) : null;
  }

  // ── Model Definitions ──────────────────────────────────────────────────

  async listModels(
    params: ListModelsParams,
  ): Promise<{ items: ModelDefinitionRecord[]; total: number }> {
    const conditions: string[] = ["deleted_at is null"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(params.isActive);
    }
    if (params.modelType) {
      conditions.push(`model_type = $${idx++}`);
      values.push(params.modelType);
    }
    if (params.providerId) {
      conditions.push(`provider_id = $${idx++}`);
      values.push(params.providerId);
    }
    if (params.keyword) {
      conditions.push(`(model_code ilike $${idx} or model_name ilike $${idx})`);
      values.push(`%${params.keyword}%`);
      idx++;
    }

    const where = conditions.join(" and ");
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from model.models where ${where}`,
        values,
      ),
      this.pool.query<ModelRow>(
        `select * from model.models where ${where} order by sort asc, model_code asc limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapModel),
    };
  }

  async getModelById(id: string): Promise<ModelDefinitionRecord | null> {
    const result = await this.pool.query<ModelRow>(
      `select * from model.models where id = $1 and deleted_at is null limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapModel(row) : null;
  }

  async getModelByCode(
    modelCode: string,
  ): Promise<ModelDefinitionRecord | null> {
    const result = await this.pool.query<ModelRow>(
      `select * from model.models where model_code = $1 and deleted_at is null limit 1`,
      [modelCode],
    );
    const row = result.rows[0];
    return row ? this.mapModel(row) : null;
  }

  async createModel(input: CreateModelInput): Promise<ModelDefinitionRecord> {
    const result = await this.pool.query<ModelRow>(
      `insert into model.models (
        provider_id, model_code, provider, model_type, protocol, model_name,
        description, endpoint_url, context_window, max_output_tokens,
        capabilities, supports_streaming, sort, config, created_by, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),now()) returning *`,
      [
        input.providerId ?? null,
        input.modelCode,
        input.provider,
        input.modelType ?? "chat",
        input.protocol,
        input.modelName,
        input.description ?? null,
        input.endpointUrl,
        input.contextWindow ?? null,
        input.maxOutputTokens ?? null,
        input.capabilities ?? [],
        input.supportsStreaming ?? true,
        input.sort ?? 999,
        input.config ? JSON.stringify(input.config) : null,
        input.createdBy ?? null,
      ],
    );
    return this.mapModel(result.rows[0]!);
  }

  async updateModel(
    id: string,
    input: UpdateModelInput,
  ): Promise<ModelDefinitionRecord | null> {
    const sets: string[] = ["updated_at = now()"];
    const values: unknown[] = [];
    let idx = 1;

    if (input.modelName !== undefined) {
      sets.push(`model_name = $${idx++}`);
      values.push(input.modelName);
    }
    if (input.description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(input.description);
    }
    if (input.endpointUrl !== undefined) {
      sets.push(`endpoint_url = $${idx++}`);
      values.push(input.endpointUrl);
    }
    if (input.contextWindow !== undefined) {
      sets.push(`context_window = $${idx++}`);
      values.push(input.contextWindow);
    }
    if (input.maxOutputTokens !== undefined) {
      sets.push(`max_output_tokens = $${idx++}`);
      values.push(input.maxOutputTokens);
    }
    if (input.capabilities !== undefined) {
      sets.push(`capabilities = $${idx++}`);
      values.push(input.capabilities);
    }
    if (input.supportsStreaming !== undefined) {
      sets.push(`supports_streaming = $${idx++}`);
      values.push(input.supportsStreaming);
    }
    if (input.isActive !== undefined) {
      sets.push(`is_active = $${idx++}`);
      values.push(input.isActive);
    }
    if (input.sort !== undefined) {
      sets.push(`sort = $${idx++}`);
      values.push(input.sort);
    }
    if (input.config !== undefined) {
      sets.push(`config = $${idx++}`);
      values.push(JSON.stringify(input.config));
    }
    if (input.updatedBy !== undefined) {
      sets.push(`updated_by = $${idx++}`);
      values.push(input.updatedBy);
    }

    values.push(id);
    const result = await this.pool.query<ModelRow>(
      `update model.models set ${sets.join(", ")} where id = $${idx} and deleted_at is null returning *`,
      values,
    );
    const row = result.rows[0];
    return row ? this.mapModel(row) : null;
  }

  // ── Model Grants ───────────────────────────────────────────────────────

  async listGrants(params: ListGrantsParams): Promise<ModelGrantRecord[]> {
    const conditions: string[] = ["deleted_at is null"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.tenantId) {
      conditions.push(`tenant_id = $${idx++}`);
      values.push(params.tenantId);
    }
    if (params.modelId) {
      conditions.push(`model_id = $${idx++}`);
      values.push(params.modelId);
    }
    if (params.agentId) {
      conditions.push(`agent_id = $${idx++}`);
      values.push(params.agentId);
    }
    if (params.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(params.isActive);
    }

    const result = await this.pool.query<GrantRow>(
      `select * from model.model_grants where ${conditions.join(" and ")} order by priority asc, created_at desc`,
      values,
    );
    return result.rows.map(this.mapGrant);
  }

  async createGrant(input: CreateGrantInput): Promise<ModelGrantRecord> {
    const result = await this.pool.query<GrantRow>(
      `insert into model.model_grants (
        model_id, tenant_id, agent_id, priority, reason, expires_at, created_by, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,now(),now()) returning *`,
      [
        input.modelId,
        input.tenantId,
        input.agentId ?? null,
        input.priority ?? 100,
        input.reason ?? null,
        input.expiresAt ?? null,
        input.createdBy ?? null,
      ],
    );
    return this.mapGrant(result.rows[0]!);
  }

  async revokeGrant(id: string, updatedBy?: string): Promise<void> {
    await this.pool.query(
      `update model.model_grants set is_active = false, updated_by = $2, updated_at = now() where id = $1`,
      [id, updatedBy ?? null],
    );
  }

  // ── Price Rules ────────────────────────────────────────────────────────

  async listPriceRules(
    params: ListPriceRulesParams,
  ): Promise<ModelPriceRuleRecord[]> {
    const conditions: string[] = [`model_id = $1`];
    const values: unknown[] = [params.modelId];
    let idx = 2;

    if (params.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(params.isActive);
    }

    const result = await this.pool.query<PriceRuleRow>(
      `select * from model.model_price_rules where ${conditions.join(" and ")} order by effective_at desc`,
      values,
    );
    return result.rows.map(this.mapPriceRule);
  }

  async createPriceRule(
    input: CreatePriceRuleInput,
  ): Promise<ModelPriceRuleRecord> {
    const result = await this.pool.query<PriceRuleRow>(
      `insert into model.model_price_rules (
        model_id, billing_mode, currency, unit_tokens,
        input_unit_price, output_unit_price, request_unit_price,
        effective_at, expires_at, created_by, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now()) returning *`,
      [
        input.modelId,
        input.billingMode ?? "token",
        input.currency ?? "CNY",
        input.unitTokens ?? 1000000,
        input.inputUnitPrice,
        input.outputUnitPrice,
        input.requestUnitPrice ?? "0",
        input.effectiveAt ?? new Date(),
        input.expiresAt ?? null,
        input.createdBy ?? null,
      ],
    );
    return this.mapPriceRule(result.rows[0]!);
  }

  async deactivatePriceRule(id: string, updatedBy?: string): Promise<void> {
    await this.pool.query(
      `update model.model_price_rules set is_active = false, updated_by = $2, updated_at = now() where id = $1`,
      [id, updatedBy ?? null],
    );
  }

  // ── Policies ───────────────────────────────────────────────────────────

  async listPolicies(params: ListPoliciesParams): Promise<ModelPolicyRecord[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.modelId) {
      conditions.push(`model_id = $${idx++}`);
      values.push(params.modelId);
    }
    if (params.tenantId) {
      conditions.push(`tenant_id = $${idx++}`);
      values.push(params.tenantId);
    }
    if (params.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(params.isActive);
    }

    const where = conditions.length ? conditions.join(" and ") : "true";
    const result = await this.pool.query<PolicyRow>(
      `select * from model.model_policies where ${where} order by priority asc`,
      values,
    );
    return result.rows.map(this.mapPolicy);
  }

  async upsertPolicy(input: UpsertPolicyInput): Promise<ModelPolicyRecord> {
    const result = await this.pool.query<PolicyRow>(
      `insert into model.model_policies (
        model_id, tenant_id, name, priority, max_concurrent, rate_limit_rpm,
        rate_limit_tpm, rate_limit_tpd, max_context_tokens, is_active,
        effective_at, expires_at, created_by, updated_by, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())
      on conflict (model_id, tenant_id) do update set
        name = excluded.name, priority = excluded.priority,
        max_concurrent = excluded.max_concurrent, rate_limit_rpm = excluded.rate_limit_rpm,
        rate_limit_tpm = excluded.rate_limit_tpm, rate_limit_tpd = excluded.rate_limit_tpd,
        max_context_tokens = excluded.max_context_tokens, is_active = excluded.is_active,
        effective_at = excluded.effective_at, expires_at = excluded.expires_at,
        updated_by = excluded.updated_by, updated_at = now()
      returning *`,
      [
        input.modelId,
        input.tenantId ?? null,
        input.name ?? null,
        input.priority ?? 100,
        input.maxConcurrent ?? null,
        input.rateLimitRpm ?? null,
        input.rateLimitTpm ?? null,
        input.rateLimitTpd ?? null,
        input.maxContextTokens ?? null,
        input.isActive ?? true,
        input.effectiveAt ?? new Date(),
        input.expiresAt ?? null,
        input.createdBy ?? null,
        input.updatedBy ?? null,
      ],
    );
    return this.mapPolicy(result.rows[0]!);
  }

  // ── Mappers ────────────────────────────────────────────────────────────

  private mapProvider(row: ProviderRow): ModelProviderRecord {
    return {
      id: row.id,
      providerCode: row.provider_code,
      providerType: row.provider_type,
      providerName: row.provider_name,
      description: row.description,
      logoUrl: row.logo_url,
      homepageUrl: row.homepage_url,
      consoleUrl: row.console_url,
      billingUrl: row.billing_url,
      isActive: row.is_active,
      config: row.config,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private mapModel(row: ModelRow): ModelDefinitionRecord {
    return {
      id: row.id,
      providerId: row.provider_id,
      modelCode: row.model_code,
      provider: row.provider,
      modelType: row.model_type,
      protocol: row.protocol,
      modelName: row.model_name,
      description: row.description,
      endpointUrl: row.endpoint_url,
      contextWindow: row.context_window,
      maxOutputTokens: row.max_output_tokens,
      capabilities: row.capabilities,
      supportsStreaming: row.supports_streaming,
      isActive: row.is_active,
      sort: row.sort,
      config: row.config,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private mapGrant(row: GrantRow): ModelGrantRecord {
    return {
      id: row.id,
      modelId: row.model_id,
      tenantId: row.tenant_id,
      agentId: row.agent_id,
      priority: row.priority,
      isActive: row.is_active,
      reason: row.reason,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private mapPriceRule(row: PriceRuleRow): ModelPriceRuleRecord {
    return {
      id: row.id,
      modelId: row.model_id,
      billingMode: row.billing_mode,
      currency: row.currency,
      unitTokens: row.unit_tokens,
      inputUnitPrice: row.input_unit_price,
      outputUnitPrice: row.output_unit_price,
      requestUnitPrice: row.request_unit_price,
      isActive: row.is_active,
      effectiveAt: row.effective_at,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPolicy(row: PolicyRow): ModelPolicyRecord {
    return {
      id: row.id,
      modelId: row.model_id,
      tenantId: row.tenant_id,
      name: row.name,
      priority: row.priority,
      maxConcurrent: row.max_concurrent,
      rateLimitRpm: row.rate_limit_rpm,
      rateLimitTpm: row.rate_limit_tpm,
      rateLimitTpd: row.rate_limit_tpd,
      maxContextTokens: row.max_context_tokens,
      isActive: row.is_active,
      effectiveAt: row.effective_at,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
