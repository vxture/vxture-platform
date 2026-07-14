/**
 * create-ticket.dto.ts - 创建工单入参 DTO
 * @package @vxture/service-ticket
 *
 * Description: 创建工单时的入参验证 DTO
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
import { TicketPriority } from "../types/ticket.types";

export class CreateTicketInput {
  @ApiProperty({ description: "工单标题", example: "登录页面无法加载" })
  @IsString()
  title!: string;

  @ApiProperty({
    description: "工单描述",
    example: "用户反馈登录页面无法正常加载，显示白屏",
  })
  @IsString()
  description!: string;

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

  @ApiProperty({ description: "工单分类", example: "frontend" })
  @IsString()
  category!: string;

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
}
