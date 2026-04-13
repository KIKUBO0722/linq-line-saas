import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateSegmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  tagIds: string[];

  @IsOptional()
  @IsString()
  matchType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeTagIds?: string[];
}

export class UpdateSegmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsString()
  matchType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeTagIds?: string[];
}

export class BroadcastSegmentDto {
  @IsString()
  message: string;
}
