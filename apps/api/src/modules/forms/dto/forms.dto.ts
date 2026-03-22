import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateFormDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  fields: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  thankYouMessage?: string;

  @IsOptional()
  @IsString()
  tagOnSubmitId?: string;
}

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  fields?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  thankYouMessage?: string;

  @IsOptional()
  @IsString()
  tagOnSubmitId?: string;
}

export class SubmitFormDto {
  @IsOptional()
  @IsString()
  friendId?: string;

  answers: Record<string, unknown>;
}
