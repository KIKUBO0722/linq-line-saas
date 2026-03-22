import { IsString, IsOptional } from 'class-validator';

export class CreateTrafficSourceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;
}
