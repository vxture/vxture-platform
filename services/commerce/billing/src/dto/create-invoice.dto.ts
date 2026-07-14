/**
 * create-invoice.dto.ts - 创建发票入参 DTO
 * @package @vxture/service-billing
 *
 * Description: 创建发票时的入参验证 DTO
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
  IsEmail,
  IsArray,
  IsNumber,
  IsOptional,
  IsDateString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateInvoiceInput {
  @ApiProperty({ description: "客户ID", example: "cust001" })
  @IsString()
  customerId!: string;

  @ApiProperty({ description: "客户姓名", example: "测试客户" })
  @IsString()
  customerName!: string;

  @ApiProperty({ description: "客户邮箱", example: "customer@example.com" })
  @IsEmail()
  customerEmail!: string;

  @ApiProperty({
    description: "订单项列表",
    example: [
      {
        description: "月度服务费",
        quantity: 1,
        unitPrice: 1000,
        taxRate: 0.1,
      },
    ],
  })
  @IsArray()
  lineItems!: Omit<LineItemInput, "id" | "amount" | "taxAmount">[];

  @ApiProperty({ description: "货币类型", example: "CNY", required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: "截止日期",
    example: "2026-03-15",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiProperty({
    description: "备注信息",
    example: "请及时支付",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class LineItemInput {
  @ApiProperty({ description: "订单项描述", example: "月度服务费" })
  @IsString()
  description!: string;

  @ApiProperty({ description: "数量", example: 1 })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ description: "单价", example: 1000 })
  @IsNumber()
  unitPrice!: number;

  @ApiProperty({ description: "税率", example: 0.1, required: false })
  @IsOptional()
  @IsNumber()
  taxRate?: number;
}
