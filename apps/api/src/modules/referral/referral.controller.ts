import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { CreateProgramDto } from './dto/referral.dto';

@ApiTags('Referral')
@Controller('api/v1')
@UseGuards(AuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('referral/programs')
  async listPrograms(@TenantId() tenantId: string) {
    return this.referralService.listPrograms(tenantId);
  }

  @Post('referral/programs')
  async createProgram(@TenantId() tenantId: string, @Body() body: CreateProgramDto) {
    return this.referralService.createProgram(tenantId, body);
  }

  @Get('referral/programs/:id/stats')
  async programStats(@Param('id') id: string) {
    return this.referralService.getProgramStats(id);
  }

  @Post('affiliate/register')
  async registerAffiliate(@CurrentUser() user: { id: string }) {
    return this.referralService.registerAffiliate(user.id);
  }

  @Get('affiliate/dashboard')
  async affiliateDashboard(@CurrentUser() user: { id: string }) {
    const partner = await this.referralService.getAffiliateByUser(user.id);
    if (!partner) return { registered: false };
    const referrals = await this.referralService.getAffiliateReferrals(partner.id);
    return { registered: true, partner, referrals };
  }
}
