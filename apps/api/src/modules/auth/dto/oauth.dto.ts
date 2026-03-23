import { IsString, IsOptional } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export interface OAuthProfile {
  provider: 'google' | 'line';
  providerId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}
