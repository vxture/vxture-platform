import { Injectable, NotFoundException } from "@nestjs/common";
import { PgProductRepository } from "../repository/pg-product.repository";
import type {
  CreatePlanInput,
  CreatePlanVersionInput,
  CreateProductInput,
  ListPlansParams,
  ListProductsParams,
  PlanDetail,
  PlanRecord,
  PlanVersionRecord,
  ProductCategoryRecord,
  ProductDetail,
  ProductRecord,
  SetProductI18nInput,
  UpdateProductInput,
} from "../types/product.types";

@Injectable()
export class ProductService {
  constructor(private readonly repo: PgProductRepository) {}

  // ── Product ────────────────────────────────────────────────────────────────

  async listProducts(
    params: ListProductsParams,
  ): Promise<{ items: ProductRecord[]; total: number }> {
    return this.repo.listProducts(params);
  }

  async getProduct(id: string): Promise<ProductRecord> {
    const product = await this.repo.getProduct(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async getProductDetail(id: string): Promise<ProductDetail> {
    const detail = await this.repo.getProductDetail(id);
    if (!detail) throw new NotFoundException(`Product ${id} not found`);
    return detail;
  }

  async createProduct(input: CreateProductInput): Promise<ProductRecord> {
    return this.repo.createProduct(input);
  }

  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductRecord> {
    const updated = await this.repo.updateProduct(id, input);
    if (!updated) throw new NotFoundException(`Product ${id} not found`);
    return updated;
  }

  async setProductI18n(input: SetProductI18nInput): Promise<void> {
    await this.getProduct(input.productId);
    await this.repo.setProductI18n(input);
  }

  async listCategories(): Promise<ProductCategoryRecord[]> {
    return this.repo.listCategories();
  }

  // ── Plan (versioned) ─────────────────────────────────────────────────────────

  async listPlans(
    params: ListPlansParams,
  ): Promise<{ items: PlanRecord[]; total: number }> {
    return this.repo.listPlans(params);
  }

  async getPlanDetail(id: string): Promise<PlanDetail> {
    const detail = await this.repo.getPlanDetail(id);
    if (!detail) throw new NotFoundException(`Plan ${id} not found`);
    return detail;
  }

  async createPlan(input: CreatePlanInput): Promise<PlanRecord> {
    return this.repo.createPlan(input);
  }

  async createPlanVersion(
    input: CreatePlanVersionInput,
  ): Promise<PlanVersionRecord> {
    await this.getPlanDetail(input.planId);
    return this.repo.createPlanVersion(input);
  }

  async publishVersion(planId: string, versionId: string): Promise<void> {
    await this.getPlanDetail(planId);
    await this.repo.publishVersion(planId, versionId);
  }
}
