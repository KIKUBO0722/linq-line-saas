import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('config')
  async getConfig(@Req() req: any) {
    const config = await this.aiService.getConfig(req.tenantId);
    return config || { autoReplyEnabled: false, systemPrompt: '', knowledgeBase: [] };
  }

  @Patch('config')
  async updateConfig(@Req() req: any, @Body() body: any) {
    return this.aiService.upsertConfig(req.tenantId, body);
  }

  @Post('generate-message')
  async generateMessage(@Body() body: { purpose: string; tone: string; target?: string; context?: string }) {
    return this.aiService.generateMessage('', body);
  }

  @Post('suggest-scenario')
  async suggestScenario(@Body() body: { industry: string; goal: string; target?: string }) {
    return this.aiService.suggestScenario('', body);
  }

  @Post('analyze-friend/:friendId')
  async analyzeFriend(@Req() req: any, @Param('friendId') friendId: string) {
    return this.aiService.analyzeFriend(req.tenantId, friendId);
  }

  @Post('onboarding')
  async onboarding(
    @Req() req: any,
    @Body() body: { industry: string; location?: string; target?: string; challenge?: string; hours?: string; menu?: string },
  ) {
    return this.aiService.onboardingSetup(req.tenantId, body);
  }

  @Post('assistant')
  async assistant(
    @Req() req: any,
    @Body() body: { message: string; page: string; pageData?: any; history?: { role: string; content: string }[] },
  ) {
    return this.aiService.contextAssistant(req.tenantId, body);
  }

  // Execute AI-proposed action (actually create in DB)
  @Post('execute-action')
  async executeAction(
    @Req() req: any,
    @Body() body: { type: string; data: any },
  ) {
    return this.aiService.executeAction(req.tenantId, body.type, body.data);
  }

  // Rollback an AI-created resource
  @Delete('rollback/:type/:id')
  async rollback(
    @Req() req: any,
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.aiService.rollbackAction(req.tenantId, type, id);
  }
}

// Public controller (no auth) for one-time setup endpoints
@Controller('api/v1/ai-public')
export class AiPublicController {
  constructor(private readonly aiService: AiService) {}

  @Post('seed-knowledge')
  async seedKnowledge() {
    return this.aiService.seedKnowledge();
  }
}
