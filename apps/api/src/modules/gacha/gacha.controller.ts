import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { GachaService } from './gacha.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/gacha')
@UseGuards(AuthGuard)
export class GachaController {
  constructor(private readonly gachaService: GachaService) {}

  @Post('campaigns')
  async createCampaign(@Req() req: any, @Body() body: { name: string; description?: string; maxDrawsPerUser?: number; style?: string; startAt?: string; endAt?: string }) {
    return this.gachaService.createCampaign(req.tenantId, body);
  }

  @Get('campaigns')
  async listCampaigns(@Req() req: any) {
    return this.gachaService.listCampaigns(req.tenantId);
  }

  @Get('campaigns/:id')
  async getCampaign(@Req() req: any, @Param('id') id: string) {
    return this.gachaService.getCampaign(id, req.tenantId);
  }

  @Put('campaigns/:id')
  async updateCampaign(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; description?: string; maxDrawsPerUser?: number; isActive?: boolean; style?: string; startAt?: string; endAt?: string }) {
    return this.gachaService.updateCampaign(id, req.tenantId, body);
  }

  @Delete('campaigns/:id')
  async deleteCampaign(@Req() req: any, @Param('id') id: string) {
    return this.gachaService.deleteCampaign(id, req.tenantId);
  }

  @Post('campaigns/:id/prizes')
  async addPrize(@Req() req: any, @Param('id') campaignId: string, @Body() body: { name: string; weight?: number; prizeType?: string; couponId?: string; winMessage?: string; maxQuantity?: number; sortOrder?: number }) {
    return this.gachaService.addPrize(campaignId, req.tenantId, body);
  }

  @Put('prizes/:id')
  async updatePrize(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; weight?: number; prizeType?: string; couponId?: string; winMessage?: string; maxQuantity?: number; sortOrder?: number }) {
    return this.gachaService.updatePrize(id, req.tenantId, body);
  }

  @Delete('prizes/:id')
  async deletePrize(@Req() req: any, @Param('id') id: string) {
    return this.gachaService.deletePrize(id, req.tenantId);
  }

  @Post('campaigns/:id/draw')
  async draw(@Req() req: any, @Param('id') campaignId: string, @Body() body: { friendId?: string }) {
    return this.gachaService.draw(campaignId, req.tenantId, body.friendId);
  }

  @Get('campaigns/:id/draws')
  async getDrawHistory(@Req() req: any, @Param('id') campaignId: string) {
    return this.gachaService.getDrawHistory(campaignId, req.tenantId);
  }
}
