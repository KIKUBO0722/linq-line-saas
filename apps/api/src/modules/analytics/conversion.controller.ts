import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/conversions')
@UseGuards(AuthGuard)
export class ConversionController {
  constructor(private readonly conversionService: ConversionService) {}

  @Post('goals')
  async createGoal(@Req() req: any, @Body() body: { name: string; type: string; targetId?: string }) {
    return this.conversionService.createGoal(req.tenantId, body);
  }

  @Get('goals')
  async listGoals(@Req() req: any) {
    return this.conversionService.listGoals(req.tenantId);
  }

  @Put('goals/:id')
  async updateGoal(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; isActive?: boolean }) {
    return this.conversionService.updateGoal(id, req.tenantId, body);
  }

  @Delete('goals/:id')
  async deleteGoal(@Req() req: any, @Param('id') id: string) {
    return this.conversionService.deleteGoal(id, req.tenantId);
  }

  @Post('events')
  async recordConversion(@Req() req: any, @Body() body: { goalId: string; friendId?: string; trackedUrlId?: string; metadata?: Record<string, unknown> }) {
    return this.conversionService.recordConversion(req.tenantId, body.goalId, body.friendId, body.trackedUrlId, body.metadata);
  }

  @Get('goals/:id/events')
  async getGoalEvents(@Req() req: any, @Param('id') id: string) {
    return this.conversionService.getGoalEvents(id, req.tenantId);
  }
}
