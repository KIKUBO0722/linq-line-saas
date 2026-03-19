import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { plans, subscriptions, usageRecords, tenants } from '@line-saas/db';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listPlans() {
    return this.db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder);
  }

  async getSubscription(tenantId: string) {
    const [sub] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);
    return sub;
  }

  async createSubscription(tenantId: string, planId: string) {
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
    return sub;
  }

  async cancelSubscription(tenantId: string) {
    await this.db
      .update(subscriptions)
      .set({ status: 'cancelled' })
      .where(eq(subscriptions.tenantId, tenantId));
  }

  async getUsage(tenantId: string) {
    const period = new Date().toISOString().slice(0, 7); // yyyy-mm
    const [usage] = await this.db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.tenantId, tenantId))
      .limit(1);
    return usage || { messagesSent: 0, aiTokensUsed: 0, friendsCount: 0, period };
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
