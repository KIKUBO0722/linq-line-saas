import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateAccountDto } from './dto/accounts.dto';

@Controller('api/v1/accounts')
@UseGuards(AuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.accountsService.findByTenant(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateAccountDto) {
    return this.accountsService.create(tenantId, body);
  }

  @Delete(':id')
  async delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.accountsService.delete(tenantId, id);
  }
}
