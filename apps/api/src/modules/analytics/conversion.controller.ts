import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConversionService } from './conversion.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateGoalDto, UpdateGoalDto, RecordConversionDto } from './dto/conversion.dto';

@ApiTags('Analytics')
@Controller('api/v1/conversions')
@UseGuards(AuthGuard)
export class ConversionController {
  constructor(private readonly conversionService: ConversionService) {}

  @Post('goals')
  async createGoal(@TenantId() tenantId: string, @Body() body: CreateGoalDto) {
    return this.conversionService.createGoal(tenantId, body);
  }

  @Get('goals')
  async listGoals(@TenantId() tenantId: string) {
    return this.conversionService.listGoals(tenantId);
  }

  @Put('goals/:id')
  async updateGoal(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdateGoalDto) {
    return this.conversionService.updateGoal(id, tenantId, body);
  }

  @Delete('goals/:id')
  async deleteGoal(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversionService.deleteGoal(id, tenantId);
  }

  @Post('events')
  async recordConversion(@TenantId() tenantId: string, @Body() body: RecordConversionDto) {
    return this.conversionService.recordConversion(tenantId, body.goalId, body.friendId, body.trackedUrlId, body.metadata);
  }

  @Get('goals/:id/events')
  async getGoalEvents(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversionService.getGoalEvents(id, tenantId);
  }
}
