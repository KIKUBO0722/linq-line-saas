import { Controller, Get, Post, Body, Req, UseGuards, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { SubscribeDto, CheckoutDto } from './dto/billing.dto';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Request } from 'express';

@ApiTags('Billing')
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
  async getSubscription(@TenantId() tenantId: string) {
    return this.billingService.getSubscription(tenantId);
  }

  @Post('subscribe')
  @UseGuards(AuthGuard)
  async subscribe(@TenantId() tenantId: string, @Body() body: SubscribeDto) {
    return this.billingService.createSubscription(tenantId, body.planId);
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  async createCheckout(@TenantId() tenantId: string, @Body() body: CheckoutDto) {
    return this.billingService.createCheckoutSession(tenantId, body.planId);
  }

  @Post('cancel')
  @UseGuards(AuthGuard)
  async cancel(@TenantId() tenantId: string) {
    await this.billingService.cancelSubscription(tenantId);
    return { ok: true };
  }

  @Get('usage')
  @UseGuards(AuthGuard)
  async getUsage(@TenantId() tenantId: string) {
    return this.billingService.getUsage(tenantId);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: Request & { rawBody: Buffer }, @Headers('stripe-signature') signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');

    if (!webhookSecret || !stripeKey) {
      return { ok: false, message: 'Stripe not configured' };
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion });

    try {
      const event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
      await this.billingService.handleStripeWebhook(event);
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, message };
    }
  }
}
