import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { plans, subscriptions, usageRecords, tenants } from '@line-saas/db';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2025-03-31.basil' as any });
    }
  }

  async listPlans() {
    return this.db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder);
  }

  async getSubscription(tenantId: string) {
    const [sub] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (!sub) return null;

    // Join plan name
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, sub.planId)).limit(1);
    return { ...sub, planName: plan?.name || 'unknown' };
  }

  async createSubscription(tenantId: string, planId: string) {
    // Cancel existing subscription if any
    await this.db
      .update(subscriptions)
      .set({ status: 'cancelled' })
      .where(eq(subscriptions.tenantId, tenantId));

    const [sub] = await this.db
      .insert(subscriptions)
      .values({
        tenantId,
        planId,
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .returning();

    // Update tenant status
    await this.db.update(tenants).set({ status: 'active' }).where(eq(tenants.id, tenantId));

    return sub;
  }

  async createCheckoutSession(tenantId: string, planId: string) {
    if (!this.stripe) {
      // Fallback: create subscription directly without payment
      return { fallback: true, subscription: await this.createSubscription(tenantId, planId) };
    }

    const [plan] = await this.db.select().from(plans).where(eq(plans.id, planId)).limit(1);
    if (!plan) throw new Error('Plan not found');

    if (plan.priceMonthly === 0) {
      // Free plan: no Stripe checkout needed
      return { fallback: true, subscription: await this.createSubscription(tenantId, planId) };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `LinQ ${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} プラン`,
              description: `友だち${plan.friendLimit}人・配信${plan.messageLimit}通/月`,
            },
            unit_amount: plan.priceMonthly,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      metadata: { tenantId, planId },
      success_url: `${this.config.get('WEB_URL')}/settings?billing=success`,
      cancel_url: `${this.config.get('WEB_URL')}/settings?billing=cancel`,
    });

    return { checkoutUrl: session.url };
  }

  async handleStripeWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const planId = session.metadata?.planId;
        if (tenantId && planId) {
          await this.db
            .update(subscriptions)
            .set({ status: 'cancelled' })
            .where(eq(subscriptions.tenantId, tenantId));

          await this.db.insert(subscriptions).values({
            tenantId,
            planId,
            stripeSubscriptionId: session.subscription as string,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });

          await this.db.update(tenants).set({ status: 'active' }).where(eq(tenants.id, tenantId));
          this.logger.log(`Subscription activated for tenant ${tenantId}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.db
          .update(subscriptions)
          .set({ status: 'cancelled' })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        this.logger.log(`Subscription cancelled: ${sub.id}`);
        break;
      }
    }
  }

  async cancelSubscription(tenantId: string) {
    const [sub] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    // Cancel on Stripe if applicable
    if (sub?.stripeSubscriptionId && this.stripe) {
      try {
        await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      } catch (err) {
        this.logger.warn(`Stripe cancellation failed: ${err}`);
      }
    }

    await this.db
      .update(subscriptions)
      .set({ status: 'cancelled' })
      .where(eq(subscriptions.tenantId, tenantId));
  }

  async getUsage(tenantId: string) {
    const period = new Date().toISOString().slice(0, 7);
    const [usage] = await this.db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.tenantId, tenantId))
      .limit(1);

    // Get plan limits
    const [sub] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    let limits: any = {};
    if (sub) {
      const [plan] = await this.db.select().from(plans).where(eq(plans.id, sub.planId)).limit(1);
      if (plan) {
        limits = {
          messagesLimit: plan.messageLimit,
          friendsLimit: plan.friendLimit,
          aiTokensLimit: plan.aiTokenLimit === -1 ? null : plan.aiTokenLimit,
        };
      }
    }

    return {
      messagesSent: usage?.messagesSent || 0,
      aiTokensUsed: usage?.aiTokensUsed || 0,
      friendsCount: usage?.friendsCount || 0,
      period: usage?.period || period,
      ...limits,
    };
  }

  async incrementUsage(tenantId: string, field: 'messagesSent' | 'aiTokensUsed', amount: number) {
    const period = new Date().toISOString().slice(0, 7);
    const existing = await this.db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.tenantId, tenantId))
      .limit(1);

    if (existing.length > 0 && existing[0].period === period) {
      const current = existing[0][field] || 0;
      await this.db
        .update(usageRecords)
        .set({ [field]: current + amount })
        .where(eq(usageRecords.id, existing[0].id));
    } else {
      await this.db.insert(usageRecords).values({
        tenantId,
        period,
        [field]: amount,
      });
    }
  }

  async checkLimit(tenantId: string, field: 'messagesSent' | 'aiTokensUsed'): Promise<{ allowed: boolean; current: number; limit: number }> {
    const usage = await this.getUsage(tenantId);
    const limitKey = field === 'messagesSent' ? 'messagesLimit' : 'aiTokensLimit';
    const limit = usage[limitKey];
    const current = field === 'messagesSent' ? usage.messagesSent : usage.aiTokensUsed;

    // -1 or null means unlimited
    if (limit === null || limit === undefined || limit === -1) {
      return { allowed: true, current, limit: -1 };
    }

    return { allowed: current < limit, current, limit };
  }

  async seedPlans() {
    const existing = await this.db.select().from(plans).limit(1);
    if (existing.length > 0) return { message: 'Plans already exist' };

    await this.db.insert(plans).values([
      {
        name: 'free',
        priceMonthly: 0,
        priceYearly: 0,
        messageLimit: 1000,
        friendLimit: 100,
        aiTokenLimit: 50,
        features: { stepScenarios: 1, richMenus: 1, forms: 1, tags: 10, teamMembers: 1 },
        sortOrder: 0,
      },
      {
        name: 'start',
        priceMonthly: 5000,
        priceYearly: 50000,
        messageLimit: 5000,
        friendLimit: 500,
        aiTokenLimit: 500,
        features: { stepScenarios: 5, richMenus: 3, forms: 3, tags: 100, teamMembers: 3 },
        sortOrder: 1,
      },
      {
        name: 'standard',
        priceMonthly: 15000,
        priceYearly: 150000,
        messageLimit: 30000,
        friendLimit: 5000,
        aiTokenLimit: 5000,
        features: { stepScenarios: -1, richMenus: -1, forms: -1, tags: -1, teamMembers: 10, aiAnalysis: true, webhook: true },
        sortOrder: 2,
      },
      {
        name: 'pro',
        priceMonthly: 30000,
        priceYearly: 300000,
        messageLimit: 100000,
        friendLimit: 50000,
        aiTokenLimit: -1,
        features: { stepScenarios: -1, richMenus: -1, forms: -1, tags: -1, teamMembers: -1, aiAnalysis: true, aiOnboarding: true, aiOptimize: true, webhook: true },
        sortOrder: 3,
      },
    ]);

    return { message: 'Plans seeded successfully' };
  }
}
