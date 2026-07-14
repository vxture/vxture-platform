/**
 * create-subscription.dto.ts - 创建订阅入参 DTO
 * @package @vxture/service-subscription
 *
 * Description: 创建订阅时的入参验证 DTO
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
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { BillingCycle } from "../types/subscription.types";

export class CreateSubscriptionInput {
  @ApiProperty({ description: "客户ID", example: "cust001" })
  @IsString()
  customerId!: string;

  @ApiProperty({ description: "套餐ID", example: "2" })
  @IsString()
  planId!: string;

  @ApiProperty({
    description: "计费周期",
    example: BillingCycle.MONTHLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  cycle?: BillingCycle;

  @ApiProperty({
    description: "开始日期",
    example: "2026-03-15",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiProperty({ description: "试用天数", example: 14, required: false })
  @IsOptional()
  @IsNumber()
  trialDays?: number;

  @ApiProperty({ description: "自动续费", example: true, required: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiProperty({ description: "支付方式ID", example: "pm001", required: false })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiProperty({
    description: "元数据",
    example: { source: "web" },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
