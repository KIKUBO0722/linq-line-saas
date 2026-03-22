import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  discountType: string;

  @IsNumber()
  discountValue: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsNumber()
  maxUses?: number;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  expiresAt?: string | null;

  @IsOptional()
  maxUses?: number | null;
}

export class ToggleCouponDto {
  @IsBoolean()
  isActive: boolean;
}
