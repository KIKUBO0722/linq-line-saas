import { IsString, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RichMenuSize {
  @IsNumber()
  width: number;

  @IsNumber()
  height: number;
}

class RichMenuTab {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  chatBarText?: string;

  @IsArray()
  areas: Record<string, unknown>[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RichMenuSize)
  size?: RichMenuSize;
}

export class CreateRichMenuGroupDto {
  @IsString()
  lineAccountId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RichMenuTab)
  tabs: RichMenuTab[];
}

export class AssignMenuDto {
  @IsString()
  friendId: string;

  @IsString()
  richMenuId: string;
}

export class CreateRichMenuDto {
  @IsString()
  lineAccountId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  chatBarText?: string;

  @IsOptional()
  @IsArray()
  areas?: Record<string, unknown>[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RichMenuSize)
  size?: RichMenuSize;
}

export class UpdateRichMenuDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  chatBarText?: string;

  @IsOptional()
  @IsArray()
  areas?: Record<string, unknown>[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RichMenuSize)
  size?: RichMenuSize;
}
