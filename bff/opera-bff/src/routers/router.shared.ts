/**
 * router.shared.ts — 数据面 router 共用的输入校验。
 * @package @vxture/bff-opera
 * @layer BFF
 *
 * 只收了当前真正用到的几个。admin-bff 那份 governance.shared 还带着 risk-records /
 * compliance-events 才用的帮手，那些没有消费方，不搬。
 */
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { RequestContext } from "../types/request-context";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 列表上限。分页由前端做，这里只挡"一次拉全表"。 */
export const LIST_LIMIT = 500;

export function requireOperatorId(req: Request & RequestContext): string {
  const id = req.operator?.id;
  if (!id || !UUID_RE.test(id)) {
    throw new UnauthorizedException("Invalid platform operator principal");
  }
  return id;
}

export function requireUuid(
  value: string | undefined,
  message: string,
): string {
  if (!value || !UUID_RE.test(value)) {
    throw new BadRequestException(message);
  }
  return value;
}

export function requireText(
  value: unknown,
  field: string,
  maxLen: number,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw new BadRequestException(`${field} exceeds ${maxLen} characters`);
  }
  return trimmed;
}

export function optionalText(
  value: unknown,
  field: string,
  maxLen: number,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requireText(value, field, maxLen);
}

/** 非空 trim 后的字符串，逐项 ≤ itemMaxLen（数组列是 varchar(64)[]）。 */
export function normalizeStringArray(
  value: unknown,
  field: string,
  itemMaxLen = 64,
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new BadRequestException(`${field} must be an array of strings`);
  }
  const out: string[] = [];
  for (const item of value) {
    if (
      typeof item !== "string" ||
      item.trim().length === 0 ||
      item.trim().length > itemMaxLen
    ) {
      throw new BadRequestException(`${field} contains an invalid value`);
    }
    out.push(item.trim());
  }
  return out;
}

export function parseIso(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required (ISO timestamp)`);
  }
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) {
    throw new BadRequestException(`${field} is not a valid timestamp`);
  }
  return ts.toISOString();
}

export function toIso(value: Date | string | null): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function toIsoOrNull(value: Date | string | null): string | null {
  return value ? toIso(value) : null;
}
