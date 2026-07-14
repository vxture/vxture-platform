/**
 * me.router.ts - 当前登录用户路由
 * @package @vxture/bff-website
 *
 * 提供当前登录用户的信息读取与更新接口：
 *   GET  /api/me           — 基础用户信息（AuthUserDto）
 *   GET  /api/me/profile   — 完整 Profile（含 bio / timezone / language 等）
 *   PUT  /api/me/profile   — 更新 Profile
 *   PUT  /api/me/password  — 修改密码
 *
 * 全部接口需登录态（由 AuthMiddleware 保证 req.user 已填充）。
 *
 * @author AI-Generated
 * @date 2026-05-03
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Application
 * @category Router
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Put,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { SessionAggregator } from "../aggregators/session.aggregator";
import {
  ChangePasswordDto,
  UpdateProfileDto,
  type AccountProfileDto,
  type AuthUserDto,
  type RequestContext,
} from "../types/auth.types";

// ============================================================================
// MeRouter
// ============================================================================

@Controller("api/me")
export class MeRouter {
  constructor(
    @Inject(SessionAggregator)
    private readonly sessionAggregator: SessionAggregator,
  ) {}

  // ── GET /api/me ────────────────────────────────────────────────────────────

  /**
   * 返回当前登录用户的基础信息。
   * 从数据库实时拉取，保证数据最新（不依赖 JWT payload 缓存）。
   */
  @Get()
  async getCurrentUser(
    @Req() req: Request & RequestContext,
  ): Promise<AuthUserDto> {
    if (!req.user) {
      throw new UnauthorizedException("No active session");
    }

    const user = await this.sessionAggregator.getCurrentUser(req.user.id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  // ── GET /api/me/profile ────────────────────────────────────────────────────

  /**
   * 返回当前登录用户的完整 Profile，含扩展字段（bio、headline、timezone、language）。
   */
  @Get("profile")
  async getCurrentUserProfile(
    @Req() req: Request & RequestContext,
  ): Promise<AccountProfileDto> {
    if (!req.user) {
      throw new UnauthorizedException("No active session");
    }

    const profile = await this.sessionAggregator.getCurrentUserProfile(
      req.user.id,
    );
    if (!profile) {
      throw new NotFoundException("Account profile not found");
    }

    return profile;
  }

  // ── PUT /api/me/profile ────────────────────────────────────────────────────

  /**
   * 更新当前登录用户的 Profile。
   * 所有字段均可选，只更新传入的字段。
   */
  @Put("profile")
  @HttpCode(HttpStatus.OK)
  async updateCurrentUserProfile(
    @Req() req: Request & RequestContext,
    @Body() body: UpdateProfileDto,
  ): Promise<AccountProfileDto> {
    if (!req.user) {
      throw new UnauthorizedException("No active session");
    }

    const profile = await this.sessionAggregator.updateCurrentUserProfile(
      req.user.id,
      body,
    );
    if (!profile) {
      throw new NotFoundException("Account profile not found");
    }

    return profile;
  }

  // ── PUT /api/me/password ───────────────────────────────────────────────────

  /**
   * 修改当前登录用户的密码。
   * 需要验证当前密码，当前密码错误时返回 401。
   */
  @Put("password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request & RequestContext,
    @Body() body: ChangePasswordDto,
  ): Promise<{ status: "ok" }> {
    if (!req.user) {
      throw new UnauthorizedException("No active session");
    }

    await this.sessionAggregator.changePassword(
      req.user.id,
      body.currentPassword,
      body.nextPassword,
    );

    return { status: "ok" };
  }
}
