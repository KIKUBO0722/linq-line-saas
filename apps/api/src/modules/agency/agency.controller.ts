import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgencyService } from './agency.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { SetMarginDto } from './dto/agency.dto';

@ApiTags('Agency')
@Controller('api/v1/agency')
@UseGuards(AuthGuard)
export class AgencyController {
  constructor(private readonly agencyService: AgencyService) {}

  @Get('status')
  async getStatus(@TenantId() tenantId: string) {
    const isAgency = await this.agencyService.isAgency(tenantId);
    return { isAgency };
  }

  @Get('overview')
  async getOverview(@TenantId() tenantId: string) {
    return this.agencyService.getOverview(tenantId);
  }

  @Get('clients')
  async getClients(@TenantId() tenantId: string) {
    return this.agencyService.getClients(tenantId);
  }

  @Post('clients/:clientTenantId')
  async addClient(@TenantId() tenantId: string, @Param('clientTenantId') clientTenantId: string) {
    await this.agencyService.addClient(tenantId, clientTenantId);
    return { ok: true };
  }

  @Delete('clients/:clientTenantId')
  async removeClient(@TenantId() tenantId: string, @Param('clientTenantId') clientTenantId: string) {
    await this.agencyService.removeClient(tenantId, clientTenantId);
    return { ok: true };
  }

  // --- Margin Management ---

  @Get('margins')
  async listMargins(@TenantId() tenantId: string) {
    return this.agencyService.listMargins(tenantId);
  }

  @Get('margins/:clientTenantId')
  async getMargin(@TenantId() tenantId: string, @Param('clientTenantId') clientTenantId: string) {
    return this.agencyService.getMargin(tenantId, clientTenantId);
  }

  @Put('margins/:clientTenantId')
  async setMargin(
    @TenantId() tenantId: string,
    @Param('clientTenantId') clientTenantId: string,
    @Body() body: SetMarginDto,
  ) {
    return this.agencyService.setMargin(tenantId, clientTenantId, body);
  }

  @Get('commissions')
  async getCommissions(@TenantId() tenantId: string) {
    return this.agencyService.getCommissions(tenantId);
  }

  @Get('commissions/summary')
  async getCommissionSummary(@TenantId() tenantId: string) {
    return this.agencyService.getCommissionSummary(tenantId);
  }
}
