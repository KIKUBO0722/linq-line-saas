import { IsString, IsOptional } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  channelId: string;

  @IsString()
  channelSecret: string;

  @IsString()
  channelAccessToken: string;

  @IsOptional()
  @IsString()
  botName?: string;
}
