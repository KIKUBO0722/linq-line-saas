import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  async listPlans() {
    return this.billingService.listPlans();
  }

  @Post('seed-plans')
  async seedPlans() {
    return this.billingService.seedPlans();
  }

  @Get('subscription')
  @UseGuards(AuthGuard)
  async getSubscription(@Req() req: any) {
    return this.billingService.getSubscription(req.tenantId);
  }

  @Post('subscribe')
  @UseGuards(AuthGuard)
  async subscribe(@Req() req: any, @Body() body: { planId: string }) {
    return this.billingService.createSubscription(req.tenantId, body.planId);
  }

  @Post('cancel')
  @UseGuards(AuthGuard)
  async cancel(@Req() req: any) {
    await this.billingService.cancelSubscription(req.tenantId);
    return { ok: true };
  }

  @Get('usage')
  @UseGuards(AuthGuard)
  async getUsage(@Req() req: any) {
    return this.billingService.getUsage(req.tenantId);
  }
}
