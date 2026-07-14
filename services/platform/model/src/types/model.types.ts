// ── Provider ───────────────────────────────────────────────────────────────

export interface ModelProviderRecord {
  id: string;
  providerCode: string;
  providerType: string;
  providerName: string;
  description: string | null;
  logoUrl: string | null;
  homepageUrl: string | null;
  consoleUrl: string | null;
  billingUrl: string | null;
  isActive: boolean;
  config: Record<string, unknown> | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ── Model Definition ────────────────────────────────────────────────────────

export interface ModelDefinitionRecord {
  id: string;
  providerId: string | null;
  modelCode: string;
  provider: string;
  modelType: string;
  protocol: string;
  modelName: string;
  description: string | null;
  endpointUrl: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  capabilities: string[];
  supportsStreaming: boolean;
  isActive: boolean;
  sort: number;
  config: Record<string, unknown> | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ── Model Grant ─────────────────────────────────────────────────────────────

export interface ModelGrantRecord {
  id: string;
  modelId: string;
  tenantId: string;
  agentId: string | null;
  priority: number;
  isActive: boolean;
  reason: string | null;
  expiresAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ── Model Price Rule ────────────────────────────────────────────────────────

export interface ModelPriceRuleRecord {
  id: string;
  modelId: string;
  billingMode: string;
  currency: string;
  unitTokens: number;
  inputUnitPrice: string;
  outputUnitPrice: string;
  requestUnitPrice: string;
  isActive: boolean;
  effectiveAt: Date;
  expiresAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Model Policy ────────────────────────────────────────────────────────────

export interface ModelPolicyRecord {
  id: string;
  modelId: string;
  tenantId: string | null;
  name: string | null;
  priority: number;
  maxConcurrent: number | null;
  rateLimitRpm: number | null;
  rateLimitTpm: bigint | null;
  rateLimitTpd: bigint | null;
  maxContextTokens: number | null;
  isActive: boolean;
  effectiveAt: Date;
  expiresAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Params & Inputs ─────────────────────────────────────────────────────────

export interface ListProvidersParams {
  isActive?: boolean;
  providerType?: string;
}
export interface ListModelsParams {
  isActive?: boolean;
  modelType?: string;
  providerId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
export interface ListGrantsParams {
  tenantId?: string;
  modelId?: string;
  agentId?: string;
  isActive?: boolean;
}
export interface ListPriceRulesParams {
  modelId: string;
  isActive?: boolean;
}
export interface ListPoliciesParams {
  modelId?: string;
  tenantId?: string;
  isActive?: boolean;
}

export interface CreateProviderInput {
  providerCode: string;
  providerType?: string;
  providerName: string;
  description?: string;
  logoUrl?: string;
  homepageUrl?: string;
  consoleUrl?: string;
  billingUrl?: string;
  config?: Record<string, unknown>;
  createdBy?: string;
}

export interface UpdateProviderInput {
  providerName?: string;
  description?: string;
  logoUrl?: string;
  homepageUrl?: string;
  consoleUrl?: string;
  billingUrl?: string;
  isActive?: boolean;
  config?: Record<string, unknown>;
  updatedBy?: string;
}

export interface CreateModelInput {
  providerId?: string;
  modelCode: string;
  provider: string;
  modelType?: string;
  protocol: string;
  modelName: string;
  description?: string;
  endpointUrl: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: string[];
  supportsStreaming?: boolean;
  sort?: number;
  config?: Record<string, unknown>;
  createdBy?: string;
}

export interface UpdateModelInput {
  modelName?: string;
  description?: string;
  endpointUrl?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: string[];
  supportsStreaming?: boolean;
  isActive?: boolean;
  sort?: number;
  config?: Record<string, unknown>;
  updatedBy?: string;
}

export interface CreateGrantInput {
  modelId: string;
  tenantId: string;
  agentId?: string;
  priority?: number;
  reason?: string;
  expiresAt?: Date;
  createdBy?: string;
}

export interface CreatePriceRuleInput {
  modelId: string;
  billingMode?: string;
  currency?: string;
  unitTokens?: number;
  inputUnitPrice: string;
  outputUnitPrice: string;
  requestUnitPrice?: string;
  effectiveAt?: Date;
  expiresAt?: Date;
  createdBy?: string;
}

export interface UpsertPolicyInput {
  modelId: string;
  tenantId?: string;
  name?: string;
  priority?: number;
  maxConcurrent?: number;
  rateLimitRpm?: number;
  rateLimitTpm?: bigint;
  rateLimitTpd?: bigint;
  maxContextTokens?: number;
  isActive?: boolean;
  effectiveAt?: Date;
  expiresAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}
