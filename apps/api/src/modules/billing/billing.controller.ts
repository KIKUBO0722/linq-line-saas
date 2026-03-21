import { Controller, Get, Post, Body, Req, UseGuards, RawBody, Headers } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Controller('api/v1/billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly config: ConfigService,
  ) {}

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

  @Post('checkout')
  @UseGuards(AuthGuard)
  async createCheckout(@Req() req: any, @Body() body: { planId: string }) {
    return this.billingService.createCheckoutSession(req.tenantId, body.planId);
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

  @Post('webhook')
  async handleWebhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');

    if (!webhookSecret || !stripeKey) {
      return { ok: false, message: 'Stripe not configured' };
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.basil' as any });

    try {
      const event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
      await this.billingService.handleStripeWebhook(event);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }
}
