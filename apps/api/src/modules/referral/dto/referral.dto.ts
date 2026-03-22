import { IsString } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  name: string;

  @IsString()
  rewardType: string;

  rewardConfig: Record<string, unknown>;
}
