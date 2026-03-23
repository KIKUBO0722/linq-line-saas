import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import {
  UpdateAiConfigDto, GenerateMessageDto, SuggestScenarioDto,
  OnboardingDto, AssistantDto, ChatSuggestDto, ExecuteActionDto,
} from './dto/ai.dto';

@ApiTags('AI')
@Controller('api/v1/ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('config')
  async getConfig(@TenantId() tenantId: string) {
    const config = await this.aiService.getConfig(tenantId);
    return config || { autoReplyEnabled: false, systemPrompt: '', knowledgeBase: [] };
  }

  @Patch('config')
  async updateConfig(@TenantId() tenantId: string, @Body() body: UpdateAiConfigDto) {
    return this.aiService.upsertConfig(tenantId, body);
  }

  @Post('generate-message')
  async generateMessage(@TenantId() tenantId: string, @Body() body: GenerateMessageDto) {
    return this.aiService.generateMessage(tenantId, body);
  }

  @Post('suggest-scenario')
  async suggestScenario(@TenantId() tenantId: string, @Body() body: SuggestScenarioDto) {
    return this.aiService.suggestScenario(tenantId, body);
  }

  @Post('analyze-friend/:friendId')
  async analyzeFriend(@TenantId() tenantId: string, @Param('friendId') friendId: string) {
    return this.aiService.analyzeFriend(tenantId, friendId);
  }

  @Post('onboarding')
  async onboarding(@TenantId() tenantId: string, @Body() body: OnboardingDto) {
    return this.aiService.onboardingSetup(tenantId, body);
  }

  @Post('assistant')
  async assistant(@TenantId() tenantId: string, @Body() body: AssistantDto) {
    return this.aiService.contextAssistant(tenantId, body);
  }

  @Post('chat-suggest')
  async chatSuggest(@TenantId() tenantId: string, @Body() body: ChatSuggestDto) {
    return this.aiService.chatSuggest(tenantId, body);
  }

  @Post('suggest-segments')
  async suggestSegments(@TenantId() tenantId: string) {
    return this.aiService.suggestSegments(tenantId);
  }

  @Post('analyze-traffic')
  async analyzeTraffic(@TenantId() tenantId: string) {
    return this.aiService.analyzeTraffic(tenantId);
  }

  @Post('generate-report')
  async generateReport(@TenantId() tenantId: string, @Query('period') period?: string) {
    return this.aiService.generateReport(tenantId, period === 'monthly' ? 'monthly' : 'weekly');
  }

  @Post('optimize-form/:formId')
  async optimizeForm(@TenantId() tenantId: string, @Param('formId') formId: string) {
    return this.aiService.optimizeForm(tenantId, formId);
  }

  @Post('execute-action')
  async executeAction(@TenantId() tenantId: string, @Body() body: ExecuteActionDto) {
    return this.aiService.executeAction(tenantId, body.type, body.data);
  }

  @Delete('rollback/:type/:id')
  async rollback(@TenantId() tenantId: string, @Param('type') type: string, @Param('id') id: string) {
    return this.aiService.rollbackAction(tenantId, type, id);
  }
}

@ApiTags('AIPublic')
@Controller('api/v1/ai-public')
export class AiPublicController {
  constructor(private readonly aiService: AiService) {}

  @Post('seed-knowledge')
  async seedKnowledge() {
    return this.aiService.seedKnowledge();
  }
}
