/**
 * skills.router.ts - 技能接入路由
 * @package @vxture/bff-admin
 *
 * Description: AI 技能的注册与管理接口。
 * 当前为结构占位，数据层接入后替换为真实查询。
 *
 * @author AI-Generated
 * @date 2026-05-02
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Application
 * @category Router
 */

import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { RequestContext, SkillRecord } from "../types/console.types";

@Controller("api/skills")
export class SkillsRouter {
  @Get()
  listSkills(@Req() req: Request & RequestContext): SkillRecord[] {
    if (!req.user) {
      throw new UnauthorizedException("No active session");
    }
    // 数据层待接入，暂返回空列表
    return [];
  }
}
