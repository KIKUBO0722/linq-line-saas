import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GachaService } from './gacha.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateCampaignDto, UpdateCampaignDto, AddPrizeDto, UpdatePrizeDto, DrawDto } from './dto/gacha.dto';

@ApiTags('Gacha')
@Controller('api/v1/gacha')
@UseGuards(AuthGuard)
export class GachaController {
  constructor(private readonly gachaService: GachaService) {}

  @Post('campaigns')
  async createCampaign(@TenantId() tenantId: string, @Body() body: CreateCampaignDto) {
    return this.gachaService.createCampaign(tenantId, body);
  }

  @Get('campaigns')
  async listCampaigns(@TenantId() tenantId: string) {
    return this.gachaService.listCampaigns(tenantId);
  }

  @Get('campaigns/:id')
  async getCampaign(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.gachaService.getCampaign(id, tenantId);
  }

  @Put('campaigns/:id')
  async updateCampaign(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdateCampaignDto) {
    return this.gachaService.updateCampaign(id, tenantId, body);
  }

  @Delete('campaigns/:id')
  async deleteCampaign(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.gachaService.deleteCampaign(id, tenantId);
  }

  @Post('campaigns/:id/prizes')
  async addPrize(@TenantId() tenantId: string, @Param('id') campaignId: string, @Body() body: AddPrizeDto) {
    return this.gachaService.addPrize(campaignId, tenantId, body);
  }

  @Put('prizes/:id')
  async updatePrize(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdatePrizeDto) {
    return this.gachaService.updatePrize(id, tenantId, body);
  }

  @Delete('prizes/:id')
  async deletePrize(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.gachaService.deletePrize(id, tenantId);
  }

  @Post('campaigns/:id/draw')
  async draw(@TenantId() tenantId: string, @Param('id') campaignId: string, @Body() body: DrawDto) {
    return this.gachaService.draw(campaignId, tenantId, body.friendId);
  }

  @Get('campaigns/:id/draws')
  async getDrawHistory(@TenantId() tenantId: string, @Param('id') campaignId: string) {
    return this.gachaService.getDrawHistory(campaignId, tenantId);
  }
}
