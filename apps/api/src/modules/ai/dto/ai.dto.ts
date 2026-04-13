import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAiConfigDto {
  @IsOptional()
  autoReplyEnabled?: boolean;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsArray()
  knowledgeBase?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  handoffKeywords?: string[];

  @IsOptional()
  @IsArray()
  keywordRules?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  tone?: string;
}

export class GenerateMessageDto {
  @IsString()
  purpose: string;

  @IsString()
  tone: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class SuggestScenarioDto {
  @IsString()
  industry: string;

  @IsString()
  goal: string;

  @IsOptional()
  @IsString()
  target?: string;
}

export class OnboardingDto {
  @IsString()
  industry: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  hours?: string;

  @IsOptional()
  @IsString()
  menu?: string;
}

class ChatHistoryEntry {
  @IsString()
  role: string;

  @IsString()
  content: string;
}

export class AssistantDto {
  @IsString()
  message: string;

  @IsString()
  page: string;

  @IsOptional()
  pageData?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryEntry)
  history?: ChatHistoryEntry[];
}

export class ChatSuggestDto {
  @IsString()
  friendId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryEntry)
  recentMessages: ChatHistoryEntry[];

  @IsOptional()
  friendInfo?: Record<string, unknown>;
}

export class ExecuteActionDto {
  @IsString()
  type: string;

  data: Record<string, unknown>;
}
