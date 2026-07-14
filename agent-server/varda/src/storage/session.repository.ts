/**
 * session.repository.ts - 会话持久化仓库
 * @package varda-server
 * @layer Application
 * @category Repository
 *
 * @description
 *   封装 VardaSession 表的 CRUD 操作。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

export interface VardaSessionRecord {
  id: string;
  userId: string;
  tenantId: string | null;
  surface: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SessionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findSession(id: string): Promise<VardaSessionRecord | null> {
    const rows = (await this.prisma.$queryRawUnsafe(
      'SELECT id, "userId", "tenantId", surface, title, "createdAt", "updatedAt" FROM "VardaSession" WHERE id = $1 LIMIT 1',
      id,
    )) as VardaSessionRecord[];
    return rows[0] ?? null;
  }

  async createSession(
    data: Omit<VardaSessionRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<VardaSessionRecord> {
    const id = randomUUID();
    const rows = (await this.prisma.$queryRawUnsafe(
      `INSERT INTO "VardaSession" (id, "userId", "tenantId", surface, title, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, "userId", "tenantId", surface, title, "createdAt", "updatedAt"`,
      id,
      data.userId,
      data.tenantId,
      data.surface,
      data.title,
    )) as VardaSessionRecord[];
    return rows[0]!;
  }

  async updateTitle(id: string, title: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      'UPDATE "VardaSession" SET title = $2, "updatedAt" = NOW() WHERE id = $1',
      id,
      title,
    );
  }

  async findById(id: string): Promise<VardaSessionRecord | null> {
    return this.findSession(id);
  }

  async create(
    data: Omit<VardaSessionRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<VardaSessionRecord> {
    return this.createSession(data);
  }
}
