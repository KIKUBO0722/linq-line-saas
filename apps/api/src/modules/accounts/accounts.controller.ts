import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/accounts')
@UseGuards(AuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.accountsService.findByTenant(req.tenantId);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() body: { channelId: string; channelSecret: string; channelAccessToken: string; botName?: string },
  ) {
    return this.accountsService.create(req.tenantId, body);
  }
}
