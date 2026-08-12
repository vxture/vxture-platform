/**
 * runos.router.ts — Runos 技术管理面代理（capability / endpoint 注册）。
 * @package @vxture/bff-opera
 * @layer Application
 * @category Router
 *
 * opera 是 Runos 的技术运维归属（同 atlas.router.ts 的先例，product_100 §3
 * L1 不变量：管理面统一按 product_250 交付，opera 统一创建各产品的管理模块，
 * 而不是各产品各自建 admin-module——见 2026-08-11 owner 口径"联邦挂载为核心
 * 路线，挂载内容归 opera 统一创建"）。
 *
 * 数据源单一权威 = Runos 的 `/capability/*` HTTP 面（RUNOS_API_URL，外部主机；
 * vxture-runos service/src/registry/registry.controller.ts 是权威契约，仓内
 * 不存副本）。认证 = operator-OBO（product_250 M-1），机制与 atlas.router.ts
 * 完全同构：把 operator 会话 access token 换成 aud=runos 的短时管理令牌
 * （scope=mgmt:runos）再转发。
 *
 * 能力码：`capability:runos.read` / `capability:runos.manage`（2026-08-11
 * 随本次接入一并注册进 admin.operator_permission，super_admin/tech_ops 持
 * manage，operation/auditor 持 read——deploy/database/seed/seed-catalog.mjs）。
 *
 * 范围只覆盖 Runos M1 已经真实实现的部分（2026-08-11 读 vxture-runos 源码
 * 核对，不是design 文档推测）：
 *   - capabilities：register / list / get / promote-to-stable
 *   - endpoints：register / set-status（没有独立的 list-all 接口——端点始终
 *     挂在某个 capability 下，读取走 capability 详情的 `endpoints` 字段）
 * policies / credentials / quality-profiles / audit(读) / supply-catalogs /
 * plugins 在 Runos 侧都还没有对应 controller（M2+ 范围），继续留在 opera 的
 * "规划中" 占位页，不在这里假装代理。
 */

import {
  BadGatewayException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { VxConfigService } from "@vxture/core-config";
import type { Request } from "express";
import { OperatorExchangeService } from "../auth/operator-exchange.service";
import type { RequestContext } from "../types/request-context";

/** 换票时的目标 audience（对齐 product_100 的产品码）。 */
const RUNOS_AUDIENCE = "runos";
/** 活库当前的三段式能力码（见文件头）。 */
const CAPABILITY_READ = "capability:runos.read";
const CAPABILITY_MANAGE = "capability:runos.manage";

type JsonObject = Record<string, unknown>;
type HttpMethod = "GET" | "POST" | "PATCH";

interface RunosErrorBody {
  code?: string;
  message?: string | string[];
  error?: string;
  statusCode?: number;
  details?: unknown;
}

export interface CapabilityVersionRecord {
  capabilityId: string;
  version: string;
  state: string;
  contract: Record<string, unknown>;
  contentDigest: string;
  createdAt: string;
}

export interface CapabilityRecord {
  capabilityId: string;
  primitiveType: string;
  providerId: string;
  ownerRef: string;
  title: string;
  admissionTier: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityDetailRecord extends CapabilityRecord {
  versions: CapabilityVersionRecord[];
  aliases: {
    capabilityId: string;
    alias: string;
    version: string;
    updatedAt: string;
  }[];
  endpoints: EndpointInstanceRecord[];
}

export interface EndpointInstanceRecord {
  id: string;
  capabilityId: string;
  version: string;
  environment: string;
  baseUrl: string;
  status: string;
  createdAt: string;
}

@Controller("api/runos")
export class RunosRouter {
  private readonly runosApiUrl: string;

  constructor(
    @Inject(VxConfigService) configService: VxConfigService,
    @Inject(OperatorExchangeService)
    private readonly operatorExchange: OperatorExchangeService,
  ) {
    this.runosApiUrl = configService.platform.RUNOS_API_URL.trim().replace(
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
          RUNOS_AUDIENCE,
        )
      : null;
    return runosRequest<T>(
      path,
      { ...options, ...(bearer ? { bearer } : {}) },
      this.runosApiUrl,
    );
  }

  // ── Capabilities ─────────────────────────────────────────────────────────

  @Get("capabilities")
  listCapabilities(
    @Req() req: Request & RequestContext,
  ): Promise<CapabilityRecord[]> {
    assertCanRead(req);
    return this.request<CapabilityRecord[]>(req, "/capability/capabilities");
  }

  @Get("capabilities/:capabilityId")
  getCapability(
    @Req() req: Request & RequestContext,
    @Param("capabilityId") capabilityId: string,
  ): Promise<CapabilityDetailRecord> {
    assertCanRead(req);
    return this.request<CapabilityDetailRecord>(
      req,
      `/capability/capabilities/${encodeURIComponent(capabilityId)}`,
    );
  }

  @Post("capabilities")
  registerCapability(
    @Req() req: Request & RequestContext,
    @Body() body: JsonObject,
  ): Promise<{
    capabilityId: string;
    version: string;
    state: string;
    admissionTier: string;
    contentDigest: string;
  }> {
    assertCanManage(req);
    return this.request(req, "/capability/capabilities", {
      method: "POST",
      body,
    });
  }

  @Post("capabilities/:capabilityId/versions/:version/promote")
  promoteCapability(
    @Req() req: Request & RequestContext,
    @Param("capabilityId") capabilityId: string,
    @Param("version") version: string,
  ): Promise<{
    capabilityId: string;
    version: string;
    state: string;
    previousStable: string | null;
  }> {
    assertCanManage(req);
    return this.request(
      req,
      `/capability/capabilities/${encodeURIComponent(capabilityId)}/versions/${encodeURIComponent(version)}/promote`,
      { method: "POST" },
    );
  }

  // ── Endpoints（永远挂在某个 capability 下，没有独立 list-all 接口）───────────

  @Post("endpoints")
  registerEndpoint(
    @Req() req: Request & RequestContext,
    @Body() body: JsonObject,
  ): Promise<EndpointInstanceRecord> {
    assertCanManage(req);
    return this.request<EndpointInstanceRecord>(req, "/capability/endpoints", {
      method: "POST",
      body,
    });
  }

  @Patch("endpoints/:endpointId/status")
  setEndpointStatus(
    @Req() req: Request & RequestContext,
    @Param("endpointId") endpointId: string,
    @Body() body: { status: string },
  ): Promise<EndpointInstanceRecord> {
    assertCanManage(req);
    return this.request<EndpointInstanceRecord>(
      req,
      `/capability/endpoints/${encodeURIComponent(endpointId)}/status`,
      { method: "PATCH", body },
    );
  }
}

function assertCanRead(req: Request & RequestContext): void {
  if (!req.operator) {
    throw new UnauthorizedException("No active session");
  }
  if (
    !req.capabilities?.includes(CAPABILITY_READ) &&
    !req.capabilities?.includes(CAPABILITY_MANAGE)
  ) {
    throw new ForbiddenException(`Missing ${CAPABILITY_READ} capability`);
  }
}

function assertCanManage(req: Request & RequestContext): void {
  if (!req.operator) {
    throw new UnauthorizedException("No active session");
  }
  if (!req.capabilities?.includes(CAPABILITY_MANAGE)) {
    throw new ForbiddenException(`Missing ${CAPABILITY_MANAGE} capability`);
  }
}

async function runosRequest<TResponse>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: JsonObject;
    bearer?: string;
  } = {},
  baseUrl: string = "http://localhost:3120",
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
    throw new BadGatewayException("Runos is unavailable");
  }

  const responseText = await response.text();

  if (!response.ok) {
    throw new HttpException(
      parseRunosError(responseText, response.status),
      response.status,
    );
  }

  if (!responseText.trim()) {
    return undefined as TResponse;
  }

  return JSON.parse(responseText) as TResponse;
}

function parseRunosError(responseText: string, status: number): RunosErrorBody {
  if (!responseText.trim()) {
    return {
      code: "RUNOS_REQUEST_FAILED",
      message: `Runos request failed with status ${status}`,
      statusCode: status,
    };
  }
  try {
    const parsed = JSON.parse(responseText) as RunosErrorBody;
    if (parsed.message !== undefined || parsed.code !== undefined) {
      return { ...parsed, statusCode: parsed.statusCode ?? status };
    }
    return {
      code: "RUNOS_REQUEST_FAILED",
      message: `Runos request failed with status ${status}`,
      statusCode: status,
      details: parsed,
    };
  } catch {
    return {
      code: "RUNOS_REQUEST_FAILED",
      message: responseText,
      statusCode: status,
    };
  }
}
