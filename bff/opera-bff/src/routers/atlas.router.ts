/**
 * atlas.router.ts — Atlas 技术管理面代理（provider / model / 用量事实）。
 * @package @vxture/bff-opera
 * @layer Application
 * @category Router
 *
 * opera 是 Atlas 的技术运维归属（owner 2026-08-11 口径："opera 完全从 admin 迁出，
 * 聚焦技术运维平台"）：Provider 接入与 Model Registry 的生命周期管理（创建/编辑/
 * 启停/删除）此前挂在 admin 的 /atlas 页，本次全量迁走，admin-bff 只留只读代理
 * （给它自己commercial 页面——price-rules/policies/quotas——挂 model 下拉用）。
 * 这不是复制一份：本文件与 admin-bff 的 atlas.router.ts 各自独立维护，类型/服务
 * 零交叉引用（不 import 对方任何东西），只是恰好代理同一个上游、恰好长得像—— 两个
 * *-bff 之间不建依赖是明确纪律。
 *
 * 数据源单一权威 = Atlas 的 `/capability/*` HTTP 面（ATLAS_API_URL，外部主机；
 * vxture-atlas/docs/20-specs/10-http-surface.md 是权威契约，仓内不存副本）。
 * 认证 = operator-OBO（product_250 M-1）：把当前 operator 的会话 access token
 * 换成 aud=atlas 的短时管理令牌再转发，opera-bff 不用自己的身份替 operator 说话。
 * OperatorExchangeService 是 opera-bff 自己的一份（在 OidcRpModule 里，和
 * admin-bff 那份代码同构但物理独立）。换票失败时降级为匿名转发而不是挡页面——
 * atlas 尚未强制校验这枚令牌的过渡期内，先让页面能看。
 *
 * 能力码：providers 用 `model:provider.manage`、models/usage-summaries 用
 * `model:model.manage`——这是活库 admin.operator_permission 里**真实存在**的当前
 * 三段式码（2026-08-11 核对：admin/super_admin/tech_ops 三个角色都直接持有这两
 * 个，opera 与 admin 从同一套 admin.operator_role_permission 表解析能力码，
 * "能力码是平台级的，不因为换了个门户就换一套"——operator-authz.service.ts 文件
 * 头）。**不用** `platform.model.manage`：那是旧扁平码，早已从 seed 目录退役，
 * 现在只活在 admin-bff 自己的 `LEGACY_CAPABILITY_BRIDGE`（auth.service.ts）里，
 * 靠那层桥接把 model:*.manage 现算成 platform.model.manage 回填进
 * capabilities——桥接是 admin 侧为了不动旧路由签名而加的过渡垫片，opera-bff 没
 * 有这段历史包袱，没有理由背同一个死码：第一次实测直接验证过（一个持
 * model:provider.manage 的账号在 opera 侧读 providers 时被判 403，查明是这里）。
 *
 * 范围覆盖 opera 技术面用得到的四类：providers（全 CRUD）、models（全 CRUD）、
 * provider-keys（vault，2026-08-12 补——atlas#131 官方 tracking marker明确写着
 * "model management incl. provider-keys vault page... will move to opera"）、
 * usage-summaries（只读，metering 页用）。grants / price-rules / policies /
 * quotas 是商业封装层，留在 admin-bff——两段裁决（opera 技术供给 → admin 商业
 * 封装，product_100_matrix.md）没有变。
 *
 * provider-keys 的四个写路由（create/rotate/activate/deactivate）在 Atlas 侧都
 * 挂了 `StepUpRequiredGuard`（vxture-atlas `operator-auth.guard.ts`
 * `hasStepUpFactor`：`amr` 必须含 pwd 以外的因子）——opera 这边不代做二次验证，
 * 操作者的平台会话本身要先过 step-up，否则 Atlas 会拒（`OPERATOR_STEP_UP_REQUIRED`），
 * 这里如实把这个错误透传给前端，不吞、不假装成功。
 */

import {
  BadGatewayException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { VxConfigService } from "@vxture/core-config";
import type { Request } from "express";
import { OperatorExchangeService } from "../auth/operator-exchange.service";
import type { RequestContext } from "../types/request-context";

/** 换票时的目标 audience（对齐 product_100 的产品码）。 */
const ATLAS_AUDIENCE = "atlas";
/** 活库当前的三段式能力码（见文件头——不是 admin-bff 那个已退役的扁平码）。 */
const PROVIDER_MANAGE_CAPABILITY = "model:provider.manage";
const MODEL_MANAGE_CAPABILITY = "model:model.manage";

type JsonObject = Record<string, unknown>;
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface AtlasErrorBody {
  code?: string;
  message?: string | string[];
  error?: string;
  statusCode?: number;
  details?: unknown;
}

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
  createdAt: string;
  updatedAt: string;
}

export interface AiModelRecord {
  id: string;
  providerId: string | null;
  modelCode: string;
  modelName: string;
  provider: string;
  endpointUrl: string;
  protocol: string;
  capabilities: string[];
  keyReference: {
    source: "env";
    name: string;
    configured: boolean;
  } | null;
  isActive: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** 元数据视图——不带密文，更不带明文；镜像 atlas 的 ProviderKeyAdminRecord。 */
export interface ProviderKeyRecord {
  id: string;
  providerCode: string;
  keyAlias: string;
  keyScope: string;
  isActive: boolean;
  lastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUsageSummaryRecord {
  id: string;
  tenantId: string;
  applicationId: string | null;
  applicationType: string | null;
  cycleMonth: string;
  statType: string;
  totalRequests: string;
  successRequests: string;
  failedRequests: string;
  totalInputTokens: string;
  totalOutputTokens: string;
  totalTokens: string;
  totalCostAmount: string;
  currency: string;
  updatedAt: string;
}

@Controller("api/atlas")
export class AtlasRouter {
  private readonly atlasApiUrl: string;

  constructor(
    @Inject(VxConfigService) configService: VxConfigService,
    @Inject(OperatorExchangeService)
    private readonly operatorExchange: OperatorExchangeService,
  ) {
    this.atlasApiUrl = configService.platform.ATLAS_API_URL.trim().replace(
      /\/+$/,
      "",
    );
  }

  private async request<T>(
    req: Request & RequestContext,
    path: string,
    options?: { method?: HttpMethod; body?: JsonObject },
  ): Promise<T> {
    const bearer = req.operatorAccessToken
      ? await this.operatorExchange.getToken(
          req.operatorAccessToken,
          ATLAS_AUDIENCE,
        )
      : null;
    return atlasRequest<T>(
      path,
      { ...options, ...(bearer ? { bearer } : {}) },
      this.atlasApiUrl,
    );
  }

  // ── Providers ────────────────────────────────────────────────────────────

  @Get("providers")
  listProviders(
    @Req() req: Request & RequestContext,
    @Query("includeInactive") includeInactive?: string,
  ): Promise<ModelProviderRecord[]> {
    assertCanManageProviders(req);
    return this.request<ModelProviderRecord[]>(
      req,
      `/capability/providers?includeInactive=${includeInactive === "false" ? "false" : "true"}`,
    );
  }

  @Post("providers")
  createProvider(
    @Req() req: Request & RequestContext,
    @Body() body: JsonObject,
  ): Promise<ModelProviderRecord> {
    assertCanManageProviders(req);
    return this.request<ModelProviderRecord>(req, "/capability/providers", {
      method: "POST",
      body,
    });
  }

  @Put("providers/:providerId")
  updateProvider(
    @Req() req: Request & RequestContext,
    @Param("providerId") providerId: string,
    @Body() body: JsonObject,
  ): Promise<ModelProviderRecord> {
    assertCanManageProviders(req);
    return this.request<ModelProviderRecord>(
      req,
      `/capability/providers/${encodeURIComponent(providerId)}`,
      { method: "PUT", body },
    );
  }

  @Post("providers/:providerId/activate")
  activateProvider(
    @Req() req: Request & RequestContext,
    @Param("providerId") providerId: string,
  ): Promise<ModelProviderRecord> {
    assertCanManageProviders(req);
    return this.request<ModelProviderRecord>(
      req,
      `/capability/providers/${encodeURIComponent(providerId)}/activate`,
      { method: "POST" },
    );
  }

  @Post("providers/:providerId/deactivate")
  deactivateProvider(
    @Req() req: Request & RequestContext,
    @Param("providerId") providerId: string,
  ): Promise<ModelProviderRecord> {
    assertCanManageProviders(req);
    return this.request<ModelProviderRecord>(
      req,
      `/capability/providers/${encodeURIComponent(providerId)}/deactivate`,
      { method: "POST" },
    );
  }

  @Delete("providers/:providerId")
  deleteProvider(
    @Req() req: Request & RequestContext,
    @Param("providerId") providerId: string,
  ): Promise<ModelProviderRecord> {
    assertCanManageProviders(req);
    return this.request<ModelProviderRecord>(
      req,
      `/capability/providers/${encodeURIComponent(providerId)}`,
      { method: "DELETE" },
    );
  }

  // ── Provider keys（vault；四个写路由在 atlas 侧都挂 StepUpRequiredGuard，
  //    这里原样转发 401/403，不吞不重试——见文件头）───────────────────────────

  @Get("provider-keys")
  listProviderKeys(
    @Req() req: Request & RequestContext,
    @Query("providerCode") providerCode?: string,
  ): Promise<ProviderKeyRecord[]> {
    assertCanManageProviders(req);
    return this.request<ProviderKeyRecord[]>(
      req,
      `/capability/provider-keys${providerCode ? `?providerCode=${encodeURIComponent(providerCode)}` : ""}`,
    );
  }

  @Post("provider-keys")
  createProviderKey(
    @Req() req: Request & RequestContext,
    @Body() body: JsonObject,
  ): Promise<ProviderKeyRecord> {
    assertCanManageProviders(req);
    return this.request<ProviderKeyRecord>(req, "/capability/provider-keys", {
      method: "POST",
      body,
    });
  }

  @Post("provider-keys/:providerKeyId/rotate")
  rotateProviderKey(
    @Req() req: Request & RequestContext,
    @Param("providerKeyId") providerKeyId: string,
    @Body() body: JsonObject,
  ): Promise<ProviderKeyRecord> {
    assertCanManageProviders(req);
    return this.request<ProviderKeyRecord>(
      req,
      `/capability/provider-keys/${encodeURIComponent(providerKeyId)}/rotate`,
      { method: "POST", body },
    );
  }

  @Put("provider-keys/:providerKeyId/activate")
  activateProviderKey(
    @Req() req: Request & RequestContext,
    @Param("providerKeyId") providerKeyId: string,
  ): Promise<ProviderKeyRecord> {
    assertCanManageProviders(req);
    return this.request<ProviderKeyRecord>(
      req,
      `/capability/provider-keys/${encodeURIComponent(providerKeyId)}/activate`,
      { method: "PUT" },
    );
  }

  @Put("provider-keys/:providerKeyId/deactivate")
  deactivateProviderKey(
    @Req() req: Request & RequestContext,
    @Param("providerKeyId") providerKeyId: string,
  ): Promise<ProviderKeyRecord> {
    assertCanManageProviders(req);
    return this.request<ProviderKeyRecord>(
      req,
      `/capability/provider-keys/${encodeURIComponent(providerKeyId)}/deactivate`,
      { method: "PUT" },
    );
  }

  // ── Models ───────────────────────────────────────────────────────────────

  @Get("models")
  listModels(
    @Req() req: Request & RequestContext,
    @Query("includeInactive") includeInactive?: string,
  ): Promise<AiModelRecord[]> {
    assertCanManageModels(req);
    return this.request<AiModelRecord[]>(
      req,
      `/capability/models?includeInactive=${includeInactive === "false" ? "false" : "true"}`,
    );
  }

  @Post("models")
  createModel(
    @Req() req: Request & RequestContext,
    @Body() body: JsonObject,
  ): Promise<AiModelRecord> {
    assertCanManageModels(req);
    return this.request<AiModelRecord>(req, "/capability/models", {
      method: "POST",
      body,
    });
  }

  @Put("models/:modelId")
  updateModel(
    @Req() req: Request & RequestContext,
    @Param("modelId") modelId: string,
    @Body() body: JsonObject,
  ): Promise<AiModelRecord> {
    assertCanManageModels(req);
    return this.request<AiModelRecord>(
      req,
      `/capability/models/${encodeURIComponent(modelId)}`,
      { method: "PUT", body },
    );
  }

  @Post("models/:modelId/activate")
  activateModel(
    @Req() req: Request & RequestContext,
    @Param("modelId") modelId: string,
  ): Promise<AiModelRecord> {
    assertCanManageModels(req);
    return this.request<AiModelRecord>(
      req,
      `/capability/models/${encodeURIComponent(modelId)}/activate`,
      { method: "POST" },
    );
  }

  @Post("models/:modelId/deactivate")
  deactivateModel(
    @Req() req: Request & RequestContext,
    @Param("modelId") modelId: string,
  ): Promise<AiModelRecord> {
    assertCanManageModels(req);
    return this.request<AiModelRecord>(
      req,
      `/capability/models/${encodeURIComponent(modelId)}/deactivate`,
      { method: "POST" },
    );
  }

  @Delete("models/:modelId")
  deleteModel(
    @Req() req: Request & RequestContext,
    @Param("modelId") modelId: string,
  ): Promise<AiModelRecord> {
    assertCanManageModels(req);
    return this.request<AiModelRecord>(
      req,
      `/capability/models/${encodeURIComponent(modelId)}`,
      { method: "DELETE" },
    );
  }

  // ── Usage summaries（只读，metering 页用；商业口径的账单归 admin 的
  //    usage-summaries 副本，这里只是同一份上游事实的技术视角只读镜像）──────────

  @Get("usage-summaries")
  listUsageSummaries(
    @Req() req: Request & RequestContext,
    @Query("tenantId") tenantId?: string,
    @Query("applicationId") applicationId?: string,
    @Query("applicationType") applicationType?: string,
    @Query("cycleMonth") cycleMonth?: string,
    @Query("statType") statType?: string,
  ): Promise<TenantUsageSummaryRecord[]> {
    assertCanManageModels(req);
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (applicationId) params.set("applicationId", applicationId);
    if (applicationType) params.set("applicationType", applicationType);
    if (cycleMonth) params.set("cycleMonth", cycleMonth);
    if (statType) params.set("statType", statType);
    return this.request<TenantUsageSummaryRecord[]>(
      req,
      `/capability/usage-summaries${params.size ? `?${params.toString()}` : ""}`,
    );
  }
}

function assertCanManageProviders(req: Request & RequestContext): void {
  if (!req.operator) {
    throw new UnauthorizedException("No active session");
  }
  if (!req.capabilities?.includes(PROVIDER_MANAGE_CAPABILITY)) {
    throw new ForbiddenException(
      `Missing ${PROVIDER_MANAGE_CAPABILITY} capability`,
    );
  }
}

function assertCanManageModels(req: Request & RequestContext): void {
  if (!req.operator) {
    throw new UnauthorizedException("No active session");
  }
  if (!req.capabilities?.includes(MODEL_MANAGE_CAPABILITY)) {
    throw new ForbiddenException(
      `Missing ${MODEL_MANAGE_CAPABILITY} capability`,
    );
  }
}

async function atlasRequest<TResponse>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: JsonObject;
    bearer?: string;
  } = {},
  baseUrl: string = "http://localhost:3100",
): Promise<TResponse> {
  let response: Response;
  const headers: Record<string, string> = {
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(options.bearer ? { authorization: `Bearer ${options.bearer}` } : {}),
  };
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new BadGatewayException("Atlas is unavailable");
  }

  const responseText = await response.text();

  if (!response.ok) {
    throw new HttpException(
      parseAtlasError(responseText, response.status),
      response.status,
    );
  }

  if (!responseText.trim()) {
    return undefined as TResponse;
  }

  return JSON.parse(responseText) as TResponse;
}

function parseAtlasError(responseText: string, status: number): AtlasErrorBody {
  if (!responseText.trim()) {
    return {
      code: "ATLAS_REQUEST_FAILED",
      message: `Atlas request failed with status ${status}`,
      statusCode: status,
    };
  }
  try {
    const parsed = JSON.parse(responseText) as AtlasErrorBody;
    if (parsed.message !== undefined || parsed.code !== undefined) {
      return { ...parsed, statusCode: parsed.statusCode ?? status };
    }
    return {
      code: "ATLAS_REQUEST_FAILED",
      message: `Atlas request failed with status ${status}`,
      statusCode: status,
      details: parsed,
    };
  } catch {
    return {
      code: "ATLAS_REQUEST_FAILED",
      message: responseText,
      statusCode: status,
    };
  }
}
