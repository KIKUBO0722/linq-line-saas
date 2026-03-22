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
  async getScenario(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.stepsService.getScenario(tenantId, id);
  }

  @Post('scenarios/:id/activate')
  async activate(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.stepsService.activateScenario(tenantId, id);
    return { ok: true };
  }

  @Post('scenarios/:id/deactivate')
  async deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.stepsService.deactivateScenario(tenantId, id);
    return { ok: true };
  }

  @Post('scenarios/:id/messages')
  async addStep(@TenantId() tenantId: string, @Param('id') scenarioId: string, @Body() body: AddStepDto) {
    return this.stepsService.addStepMessage(tenantId, scenarioId, body);
  }

  @Patch('messages/:id')
  async updateStep(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdateStepDto) {
    return this.stepsService.updateStepMessage(tenantId, id, body);
  }

  @Delete('messages/:id')
  async deleteStep(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.stepsService.deleteStepMessage(tenantId, id);
    return { ok: true };
  }

  @Post('scenarios/:id/enroll')
  async enroll(@TenantId() tenantId: string, @Param('id') scenarioId: string, @Body() body: EnrollFriendDto) {
    return this.stepsService.enrollFriend(tenantId, body.friendId, scenarioId);
  }

  @Get('scenarios/:id/enrollments')
  async enrollments(@TenantId() tenantId: string, @Param('id') scenarioId: string) {
    return this.stepsService.getEnrollments(tenantId, scenarioId);
  }
}
