import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { StepsService } from './steps.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/steps')
@UseGuards(AuthGuard)
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @Get('scenarios')
  async listScenarios(@Req() req: any) {
    return this.stepsService.listScenarios(req.tenantId);
  }

  @Post('scenarios')
  async createScenario(
    @Req() req: any,
    @Body() body: { name: string; description?: string; triggerType: string; triggerConfig?: any },
  ) {
    return this.stepsService.createScenario(req.tenantId, body);
  }

  @Get('scenarios/:id')
  async getScenario(@Param('id') id: string) {
    return this.stepsService.getScenario(id);
  }

  @Post('scenarios/:id/activate')
  async activate(@Param('id') id: string) {
    await this.stepsService.activateScenario(id);
    return { ok: true };
  }

  @Post('scenarios/:id/deactivate')
  async deactivate(@Param('id') id: string) {
    await this.stepsService.deactivateScenario(id);
    return { ok: true };
  }

  @Post('scenarios/:id/messages')
  async addStep(
    @Param('id') scenarioId: string,
    @Body() body: { delayMinutes: number; messageContent: any; sortOrder: number; condition?: any },
  ) {
    return this.stepsService.addStepMessage(scenarioId, body);
  }

  @Patch('messages/:id')
  async updateStep(
    @Param('id') id: string,
    @Body() body: { condition?: any; branchTrue?: number | null; branchFalse?: number | null; delayMinutes?: number; messageContent?: any },
  ) {
    return this.stepsService.updateStepMessage(id, body);
  }

  @Delete('messages/:id')
  async deleteStep(@Param('id') id: string) {
    await this.stepsService.deleteStepMessage(id);
    return { ok: true };
  }

  @Post('scenarios/:id/enroll')
  async enroll(@Param('id') scenarioId: string, @Body() body: { friendId: string }) {
    return this.stepsService.enrollFriend(body.friendId, scenarioId);
  }

  @Get('scenarios/:id/enrollments')
  async enrollments(@Param('id') scenarioId: string) {
    return this.stepsService.getEnrollments(scenarioId);
  }
}
