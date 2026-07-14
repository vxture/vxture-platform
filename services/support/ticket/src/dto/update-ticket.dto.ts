/**
 * update-ticket.dto.ts - 更新工单入参 DTO
 * @package @vxture/service-ticket
 *
 * Description: 更新工单时的入参验证 DTO
 *
 * @author AI-Generated
 * @date 2026-03-11
 * @version 1.0
 *
 * @layer Domain
 * @category DTO
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { TicketStatus, TicketPriority } from "../types/ticket.types";

export class UpdateTicketInput {
  @ApiProperty({
    description: "工单标题",
    example: "登录页面无法加载",
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: "工单描述",
    example: "用户反馈登录页面无法正常加载，显示白屏",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "工单状态",
    example: TicketStatus.IN_PROGRESS,
    required: false,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({
    description: "工单优先级",
    example: TicketPriority.HIGH,
    required: false,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ description: "分配人ID", example: "dev456", required: false })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({
    description: "工单分类",
    example: "frontend",
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: "标签列表",
    example: ["bug", "login"],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: "截止日期",
    example: "2026-03-08",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiProperty({
    description: "解决方案",
    example: "修复了登录页面的加载问题",
    required: false,
  })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiProperty({
    description: "解决日期",
    example: "2026-03-07",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  resolutionDate?: Date;
}
