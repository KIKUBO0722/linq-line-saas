import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExitPopupsService } from './exit-popups.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateExitPopupDto, UpdateExitPopupDto } from './dto/exit-popups.dto';

@ApiTags('ExitPopups')
@Controller()
export class ExitPopupsController {
  constructor(private readonly exitPopupsService: ExitPopupsService) {}

  @Post('api/v1/exit-popups')
  @UseGuards(AuthGuard)
  async create(@TenantId() tenantId: string, @Body() body: CreateExitPopupDto) {
    return this.exitPopupsService.create(tenantId, body);
  }

  @Get('api/v1/exit-popups')
  @UseGuards(AuthGuard)
  async list(@TenantId() tenantId: string) {
    return this.exitPopupsService.list(tenantId);
  }

  @Put('api/v1/exit-popups/:id')
  @UseGuards(AuthGuard)
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdateExitPopupDto) {
    return this.exitPopupsService.update(id, tenantId, body);
  }

  @Delete('api/v1/exit-popups/:id')
  @UseGuards(AuthGuard)
  async delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.exitPopupsService.delete(id, tenantId);
  }

  @Get('api/v1/exit-popups/public/:tenantId')
  async getPublic(
    @Param('tenantId') tid: string,
    @Query('targetType') targetType: string,
    @Query('targetId') targetId?: string,
  ) {
    return this.exitPopupsService.getActiveForTarget(tid, targetType || 'form', targetId);
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
