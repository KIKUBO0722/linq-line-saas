import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1')
@UseGuards(AuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // Tenant referral programs
  @Get('referral/programs')
  async listPrograms(@Req() req: any) {
    return this.referralService.listPrograms(req.tenantId);
  }

  @Post('referral/programs')
  async createProgram(@Req() req: any, @Body() body: { name: string; rewardType: string; rewardConfig: any }) {
    return this.referralService.createProgram(req.tenantId, body);
  }

  @Get('referral/programs/:id/stats')
  async programStats(@Param('id') id: string) {
    return this.referralService.getProgramStats(id);
  }

  // SaaS affiliate
  @Post('affiliate/register')
  async registerAffiliate(@Req() req: any) {
    return this.referralService.registerAffiliate(req.user.id);
  }

  @Get('affiliate/dashboard')
  async affiliateDashboard(@Req() req: any) {
    const partner = await this.referralService.getAffiliateByUser(req.user.id);
    if (!partner) return { registered: false };
    const referrals = await this.referralService.getAffiliateReferrals(partner.id);
    return { registered: true, partner, referrals };
  }
}
