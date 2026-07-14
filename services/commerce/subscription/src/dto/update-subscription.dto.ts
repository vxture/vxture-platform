/**
 * update-subscription.dto.ts - 更新订阅入参 DTO
 * @package @vxture/service-subscription
 *
 * Description: 更新订阅时的入参验证 DTO
 *
 * @author AI-Generated
 * @date 2026-03-11
 * @version 1.0
 *
 * @layer Domain
 * @category DTO
 */

import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { BillingCycle, SubscriptionStatus } from "../types/subscription.types";

export class UpdateSubscriptionInput {
  @ApiProperty({ description: "新套餐ID", example: "3", required: false })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiProperty({
    description: "新计费周期",
    example: BillingCycle.YEARLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  cycle?: BillingCycle;

  @ApiProperty({ description: "自动续费", example: false, required: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiProperty({ description: "到期取消", example: true, required: false })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiProperty({ description: "支付方式ID", example: "pm002", required: false })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiProperty({
    description: "状态",
    example: SubscriptionStatus.SUSPENDED,
    required: false,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({
    description: "元数据",
    example: { notes: "客户要求暂停" },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
