import { IsString, IsOptional, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class SetMarginDto {
  @IsIn(['percentage', 'fixed'])
  marginType: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  marginValue: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
