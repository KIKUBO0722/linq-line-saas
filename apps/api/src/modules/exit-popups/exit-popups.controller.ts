import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ExitPopupsService } from './exit-popups.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller()
export class ExitPopupsController {
  constructor(private readonly exitPopupsService: ExitPopupsService) {}

  @Post('api/v1/exit-popups')
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() body: { name: string; targetType?: string; targetId?: string; title?: string; message?: string; couponCode?: string; couponLabel?: string; ctaText?: string; ctaUrl?: string; triggerType?: string; delaySeconds?: number }) {
    return this.exitPopupsService.create(req.tenantId, body);
  }

  @Get('api/v1/exit-popups')
  @UseGuards(AuthGuard)
  async list(@Req() req: any) {
    return this.exitPopupsService.list(req.tenantId);
  }

  @Put('api/v1/exit-popups/:id')
  @UseGuards(AuthGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; targetType?: string; targetId?: string; title?: string; message?: string; couponCode?: string; couponLabel?: string; ctaText?: string; ctaUrl?: string; triggerType?: string; delaySeconds?: number; isActive?: boolean }) {
    return this.exitPopupsService.update(id, req.tenantId, body);
  }

  @Delete('api/v1/exit-popups/:id')
  @UseGuards(AuthGuard)
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.exitPopupsService.delete(id, req.tenantId);
  }

  @Get('api/v1/exit-popups/public/:tenantId')
  async getPublic(
    @Param('tenantId') tenantId: string,
    @Query('targetType') targetType: string,
    @Query('targetId') targetId?: string,
  ) {
    return this.exitPopupsService.getActiveForTarget(tenantId, targetType || 'form', targetId);
  }

  @Post('api/v1/exit-popups/:id/shown')
  async recordShow(@Param('id') id: string) {
    await this.exitPopupsService.incrementShow(id);
    return { success: true };
  }

  @Post('api/v1/exit-popups/:id/clicked')
  async recordClick(@Param('id') id: string) {
    await this.exitPopupsService.incrementClick(id);
    return { success: true };
  }
}
