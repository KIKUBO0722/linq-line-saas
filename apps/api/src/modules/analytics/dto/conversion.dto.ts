import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  targetId?: string;
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RecordConversionDto {
  @IsString()
  goalId: string;

  @IsOptional()
  @IsString()
  friendId?: string;

  @IsOptional()
  @IsString()
  trackedUrlId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
