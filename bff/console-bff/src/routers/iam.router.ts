import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { SessionAggregator } from "../aggregators/session.aggregator";
import {
  ResetMemberPasswordDto,
  UpdateMemberDto,
  UpsertMemberDto,
} from "../dto/member.dto";
import { CreateRoleDto, UpdateRoleDto } from "../dto/role.dto";
import type { RequestContext } from "../types/console.types";

function requireTenantSession(req: Request & RequestContext) {
  if (!req.user) {
    throw new UnauthorizedException("No active session");
  }
  if (!req.tenant) {
    throw new UnauthorizedException("Tenant context is required");
  }

  return { accountId: req.user.id, tenantId: req.tenant.id };
}

@Controller("api/iam")
export class IamRouter {
  constructor(
    @Inject(SessionAggregator)
    private readonly sessionAggregator: SessionAggregator,
  ) {}

  @Get("summary")
  async getSummary(@Req() req: Request & RequestContext) {
    const { accountId, tenantId } = requireTenantSession(req);

    const summary = await this.sessionAggregator.getIamSummary(
      accountId,
      tenantId,
    );

    return {
      members: summary.totalMembers,
      activeMembers: summary.activeMembers,
      primaryOwners: summary.primaryOwners,
      roles: summary.activeRoles,
    };
  }

  @Get("members")
  async getMembers(@Req() req: Request & RequestContext) {
    const { accountId, tenantId } = requireTenantSession(req);

    return this.sessionAggregator.listMembers(accountId, tenantId);
  }

  @Get("members/:memberId")
  async getMember(
    @Req() req: Request & RequestContext,
    @Param("memberId") memberId: string,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const member = await this.sessionAggregator.getMember(
      accountId,
      tenantId,
      memberId,
    );
    if (!member) {
      throw new NotFoundException("Member not found");
    }

    return member;
  }

  @Get("roles")
  async getRoles(@Req() req: Request & RequestContext) {
    const { accountId, tenantId } = requireTenantSession(req);

    return this.sessionAggregator.listTenantRoles(accountId, tenantId);
  }

  @Get("permissions")
  async getPermissions(@Req() req: Request & RequestContext) {
    const { accountId, tenantId } = requireTenantSession(req);

    return this.sessionAggregator.listTenantPermissions(accountId, tenantId);
  }

  @Post("roles")
  async createRole(
    @Req() req: Request & RequestContext,
    @Body() body: CreateRoleDto,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const role = await this.sessionAggregator.createRole(
      accountId,
      tenantId,
      body,
    );
    if (!role) {
      throw new NotFoundException("Role could not be created");
    }

    return role;
  }

  @Put("roles/:roleId")
  async updateRole(
    @Req() req: Request & RequestContext,
    @Param("roleId") roleId: string,
    @Body() body: UpdateRoleDto,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const role = await this.sessionAggregator.updateRole(
      accountId,
      tenantId,
      roleId,
      body,
    );
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    return role;
  }

  @Delete("roles/:roleId")
  async deleteRole(
    @Req() req: Request & RequestContext,
    @Param("roleId") roleId: string,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const removed = await this.sessionAggregator.deleteRole(
      accountId,
      tenantId,
      roleId,
    );
    if (!removed) {
      throw new NotFoundException("Role not found");
    }

    return { status: "ok" as const };
  }

  @Post("members")
  async createMember(
    @Req() req: Request & RequestContext,
    @Body() body: UpsertMemberDto,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const member = await this.sessionAggregator.createMember(
      accountId,
      tenantId,
      body,
    );
    if (!member) {
      throw new NotFoundException("Tenant member could not be created");
    }

    return member;
  }

  @Post("members/invite")
  async inviteMember(
    @Req() req: Request & RequestContext,
    @Body() body: UpsertMemberDto,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const member = await this.sessionAggregator.inviteMember(
      accountId,
      tenantId,
      body,
    );
    if (!member) {
      throw new NotFoundException("Tenant member could not be invited");
    }

    return member;
  }

  @Put("members/:memberId")
  async updateMember(
    @Req() req: Request & RequestContext,
    @Param("memberId") memberId: string,
    @Body() body: UpdateMemberDto,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const member = await this.sessionAggregator.updateMember(
      accountId,
      tenantId,
      memberId,
      body,
    );
    if (!member) {
      throw new NotFoundException("Member not found");
    }

    return member;
  }

  @Post("members/:memberId/disable")
  async disableMember(
    @Req() req: Request & RequestContext,
    @Param("memberId") memberId: string,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const member = await this.sessionAggregator.disableMember(
      accountId,
      tenantId,
      memberId,
    );
    if (!member) {
      throw new NotFoundException("Member not found");
    }

    return member;
  }

  @Post("members/:memberId/reset-password")
  async resetMemberPassword(
    @Req() req: Request & RequestContext,
    @Param("memberId") memberId: string,
    @Body() body: ResetMemberPasswordDto,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const reset = await this.sessionAggregator.resetMemberPassword(
      accountId,
      tenantId,
      memberId,
      body.nextPassword,
    );
    if (!reset) {
      throw new NotFoundException("Member not found");
    }

    return { status: "ok" as const };
  }

  @Delete("members/:memberId")
  async removeMember(
    @Req() req: Request & RequestContext,
    @Param("memberId") memberId: string,
  ) {
    const { accountId, tenantId } = requireTenantSession(req);

    const removed = await this.sessionAggregator.removeMember(
      accountId,
      tenantId,
      memberId,
    );
    if (!removed) {
      throw new NotFoundException("Member not found");
    }

    return { status: "ok" as const };
  }
}
