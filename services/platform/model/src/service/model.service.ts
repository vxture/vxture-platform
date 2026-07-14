import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PgModelRepository } from "../repository/pg-model.repository";
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

@Injectable()
export class ModelService {
  constructor(private readonly repo: PgModelRepository) {}

  // ── Providers ──────────────────────────────────────────────────────────

  async listProviders(
    params: ListProvidersParams,
  ): Promise<ModelProviderRecord[]> {
    return this.repo.listProviders(params);
  }

  async getProviderById(id: string): Promise<ModelProviderRecord> {
    const provider = await this.repo.getProviderById(id);
    if (!provider) throw new NotFoundException(`Provider ${id} not found`);
    return provider;
  }

  async createProvider(
    input: CreateProviderInput,
  ): Promise<ModelProviderRecord> {
    const existing = await this.repo.getProviderByCode(input.providerCode);
    if (existing)
      throw new ConflictException(
        `Provider code ${input.providerCode} already exists`,
      );
    return this.repo.createProvider(input);
  }

  async updateProvider(
    id: string,
    input: UpdateProviderInput,
  ): Promise<ModelProviderRecord> {
    const updated = await this.repo.updateProvider(id, input);
    if (!updated) throw new NotFoundException(`Provider ${id} not found`);
    return updated;
  }

  // ── Model Definitions ──────────────────────────────────────────────────

  async listModels(
    params: ListModelsParams,
  ): Promise<{ items: ModelDefinitionRecord[]; total: number }> {
    return this.repo.listModels(params);
  }

  async getModelById(id: string): Promise<ModelDefinitionRecord> {
    const model = await this.repo.getModelById(id);
    if (!model) throw new NotFoundException(`Model ${id} not found`);
    return model;
  }

  async createModel(input: CreateModelInput): Promise<ModelDefinitionRecord> {
    const existing = await this.repo.getModelByCode(input.modelCode);
    if (existing)
      throw new ConflictException(
        `Model code ${input.modelCode} already exists`,
      );
    return this.repo.createModel(input);
  }

  async updateModel(
    id: string,
    input: UpdateModelInput,
  ): Promise<ModelDefinitionRecord> {
    const updated = await this.repo.updateModel(id, input);
    if (!updated) throw new NotFoundException(`Model ${id} not found`);
    return updated;
  }

  // ── Model Grants ───────────────────────────────────────────────────────

  async listGrants(params: ListGrantsParams): Promise<ModelGrantRecord[]> {
    return this.repo.listGrants(params);
  }

  async createGrant(input: CreateGrantInput): Promise<ModelGrantRecord> {
    await this.getModelById(input.modelId);
    return this.repo.createGrant(input);
  }

  async revokeGrant(id: string, updatedBy?: string): Promise<void> {
    await this.repo.revokeGrant(id, updatedBy);
  }

  // ── Price Rules ────────────────────────────────────────────────────────

  async listPriceRules(
    params: ListPriceRulesParams,
  ): Promise<ModelPriceRuleRecord[]> {
    return this.repo.listPriceRules(params);
  }

  async createPriceRule(
    input: CreatePriceRuleInput,
  ): Promise<ModelPriceRuleRecord> {
    await this.getModelById(input.modelId);
    return this.repo.createPriceRule(input);
  }

  async deactivatePriceRule(id: string, updatedBy?: string): Promise<void> {
    await this.repo.deactivatePriceRule(id, updatedBy);
  }

  // ── Policies ───────────────────────────────────────────────────────────

  async listPolicies(params: ListPoliciesParams): Promise<ModelPolicyRecord[]> {
    return this.repo.listPolicies(params);
  }

  async upsertPolicy(input: UpsertPolicyInput): Promise<ModelPolicyRecord> {
    await this.getModelById(input.modelId);
    return this.repo.upsertPolicy(input);
  }
}
