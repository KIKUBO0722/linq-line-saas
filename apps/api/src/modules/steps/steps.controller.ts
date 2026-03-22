import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { StepsService } from './steps.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateScenarioDto, AddStepDto, UpdateStepDto, EnrollFriendDto } from './dto/steps.dto';

@Controller('api/v1/steps')
@UseGuards(AuthGuard)
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @Get('scenarios')
  async listScenarios(@TenantId() tenantId: string) {
    return this.stepsService.listScenarios(tenantId);
  }

  @Post('scenarios')
  async createScenario(@TenantId() tenantId: string, @Body() body: CreateScenarioDto) {
    return this.stepsService.createScenario(tenantId, body);
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
  async addStep(@Param('id') scenarioId: string, @Body() body: AddStepDto) {
    return this.stepsService.addStepMessage(scenarioId, body);
  }

  @Patch('messages/:id')
  async updateStep(@Param('id') id: string, @Body() body: UpdateStepDto) {
    return this.stepsService.updateStepMessage(id, body);
  }

  @Delete('messages/:id')
  async deleteStep(@Param('id') id: string) {
    await this.stepsService.deleteStepMessage(id);
    return { ok: true };
  }

  @Post('scenarios/:id/enroll')
  async enroll(@Param('id') scenarioId: string, @Body() body: EnrollFriendDto) {
    return this.stepsService.enrollFriend(body.friendId, scenarioId);
  }

  @Get('scenarios/:id/enrollments')
  async enrollments(@Param('id') scenarioId: string) {
    return this.stepsService.getEnrollments(scenarioId);
  }
}
