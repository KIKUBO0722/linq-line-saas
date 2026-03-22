import { IsString, IsOptional } from 'class-validator';

export class CreateTrackedUrlDto {
  @IsString()
  originalUrl: string;

  @IsOptional()
  @IsString()
  messageId?: string;
}

export class UpdateTrackedUrlDto {
  @IsOptional()
  @IsString()
  originalUrl?: string;
}
