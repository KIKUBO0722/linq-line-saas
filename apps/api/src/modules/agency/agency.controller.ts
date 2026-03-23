import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { AgencyService } from './agency.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

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
}
