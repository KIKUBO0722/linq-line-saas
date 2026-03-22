import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateScenarioDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  triggerType: string;

  @IsOptional()
  triggerConfig?: Record<string, unknown>;
}

export class AddStepDto {
  @IsNumber()
  delayMinutes: number;

  messageContent: Record<string, unknown>;

  @IsNumber()
  sortOrder: number;

  @IsOptional()
  condition?: Record<string, unknown>;
}

export class UpdateStepDto {
  @IsOptional()
  condition?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  branchTrue?: number | null;

  @IsOptional()
  @IsNumber()
  branchFalse?: number | null;

  @IsOptional()
  @IsNumber()
  delayMinutes?: number;

  @IsOptional()
  messageContent?: Record<string, unknown>;
}

export class EnrollFriendDto {
  @IsString()
  friendId: string;
}
