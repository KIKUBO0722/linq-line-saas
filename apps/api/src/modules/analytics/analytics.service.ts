import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, sql, count } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { friends, messages, webhookEvents, analyticsEvents } from '@line-saas/db';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getOverview(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [friendStats] = await this.db
      .select({ total: count(), following: count(friends.isFollowing) })
      .from(friends)
      .where(eq(friends.tenantId, tenantId));

    const [messageStats] = await this.db
      .select({ total: count() })
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), gte(messages.createdAt, thirtyDaysAgo)));

    const [outboundStats] = await this.db
      .select({ total: count() })
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'outbound'),
          gte(messages.createdAt, thirtyDaysAgo),
        ),
      );

    const [inboundStats] = await this.db
      .select({ total: count() })
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'inbound'),
          gte(messages.createdAt, thirtyDaysAgo),
        ),
      );

    const [eventStats] = await this.db
      .select({ total: count() })
      .from(webhookEvents)
      .where(and(eq(webhookEvents.tenantId, tenantId), gte(webhookEvents.createdAt, thirtyDaysAgo)));

    return {
      friends: { total: friendStats?.total || 0 },
      messages: {
        total: messageStats?.total || 0,
        outbound: outboundStats?.total || 0,
        inbound: inboundStats?.total || 0,
      },
      events: { total: eventStats?.total || 0 },
      period: '30days',
    };
  }

  async trackEvent(tenantId: string, eventName: string, friendId?: string, metadata?: any) {
    await this.db.insert(analyticsEvents).values({ tenantId, eventName, friendId, metadata });
  }
}
