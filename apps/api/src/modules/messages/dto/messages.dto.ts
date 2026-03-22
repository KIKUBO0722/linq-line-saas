import { IsString, IsOptional, IsArray, IsEnum, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SendTextDto {
  @IsString()
  friendId: string;

  @IsString()
  text: string;
}

class QuickReplyAction {
  @IsString()
  type: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  uri?: string;

  @IsOptional()
  @IsString()
  data?: string;
}

class QuickReplyItem {
  @IsString()
  type: 'action';

  @ValidateNested()
  @Type(() => QuickReplyAction)
  action: QuickReplyAction;
}

class QuickReply {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickReplyItem)
  items: QuickReplyItem[];
}

export class MessagePayload {
  @IsEnum(['text', 'image', 'video', 'audio', 'flex'])
  type: 'text' | 'image' | 'video' | 'audio' | 'flex';

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  originalContentUrl?: string;

  @IsOptional()
  @IsString()
  previewImageUrl?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  contents?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuickReply)
  quickReply?: QuickReply;
}

export class SendMessageDto {
  @IsString()
  friendId: string;

  @ValidateNested()
  @Type(() => MessagePayload)
  message: MessagePayload;
}

export class BroadcastMessageDto {
  @ValidateNested()
  @Type(() => MessagePayload)
  message: MessagePayload;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class BroadcastTextDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class TestSendDto {
  @IsArray()
  @IsString({ each: true })
  friendIds: string[];

  @IsString()
  message: string;
}
