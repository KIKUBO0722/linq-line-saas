import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { friends, messages, webhookEvents, analyticsEvents, lineAccounts, trafficSources } from '@line-saas/db';
import { LineService } from '../line/line.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly lineService: LineService,
  ) {}

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

  async getBroadcastHistory(tenantId: string) {
    return this.db
      .select({
        id: messages.id,
        content: messages.content,
        status: messages.status,
        sendType: messages.sendType,
        scheduledAt: messages.scheduledAt,
        sentAt: messages.sentAt,
        createdAt: messages.createdAt,
        error: messages.error,
      })
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'outbound'),
          eq(messages.sendType, 'broadcast'),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(50);
  }

  async getDailyStats(tenantId: string, days: number = 14) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const dailyOutbound = await this.db
      .select({
        date: sql<string>`date(${messages.createdAt})`.as('date'),
        count: count(),
      })
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'outbound'),
          gte(messages.createdAt, startDate),
        ),
      )
      .groupBy(sql`date(${messages.createdAt})`)
      .orderBy(sql`date(${messages.createdAt})`);

    const dailyInbound = await this.db
      .select({
        date: sql<string>`date(${messages.createdAt})`.as('date'),
        count: count(),
      })
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'inbound'),
          gte(messages.createdAt, startDate),
        ),
      )
      .groupBy(sql`date(${messages.createdAt})`)
      .orderBy(sql`date(${messages.createdAt})`);

    const dailyFriends = await this.db
      .select({
        date: sql<string>`date(${friends.createdAt})`.as('date'),
        count: count(),
      })
      .from(friends)
      .where(
        and(
          eq(friends.tenantId, tenantId),
          gte(friends.createdAt, startDate),
        ),
      )
      .groupBy(sql`date(${friends.createdAt})`)
      .orderBy(sql`date(${friends.createdAt})`);

    return { dailyOutbound, dailyInbound, dailyFriends };
  }

  async getDeliveryInsight(tenantId: string, date: string) {
    const accounts = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.tenantId, tenantId), eq(lineAccounts.isActive, true)));

    const results: any[] = [];
    for (const account of accounts) {
      try {
        const stats = await this.lineService.getNumberOfMessageDeliveries(
          { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
          date,
        );
        results.push({
          accountId: account.id,
          botName: account.botName,
          date,
          ...stats,
        });
      } catch (err: any) {
        this.logger.warn(`Failed to get delivery insight for account ${account.id}: ${err.message}`);
        results.push({
          accountId: account.id,
          botName: account.botName,
          date,
          status: 'error',
          error: err.message,
        });
      }
    }

    return results;
  }

  async trackEvent(tenantId: string, eventName: string, friendId?: string, metadata?: any) {
    await this.db.insert(analyticsEvents).values({ tenantId, eventName, friendId, metadata });
  }

  // --- Traffic Sources ---

  async listTrafficSources(tenantId: string) {
    return this.db
      .select()
      .from(trafficSources)
      .where(eq(trafficSources.tenantId, tenantId))
      .orderBy(trafficSources.createdAt);
  }

  async createTrafficSource(
    tenantId: string,
    data: { name: string; utmSource?: string; utmMedium?: string; utmCampaign?: string },
  ) {
    const code = `ts_${Date.now().toString(36)}`;
    const [source] = await this.db
      .insert(trafficSources)
      .values({
        tenantId,
        name: data.name,
        code,
        utmParams: {
          utm_source: data.utmSource,
          utm_medium: data.utmMedium,
          utm_campaign: data.utmCampaign,
        },
      })
      .returning();
    return source;
  }

  async deleteTrafficSource(id: string) {
    await this.db.delete(trafficSources).where(eq(trafficSources.id, id));
  }

  async getSourceStats(tenantId: string) {
    const sources = await this.db
      .select()
      .from(trafficSources)
      .where(eq(trafficSources.tenantId, tenantId));

    const stats = [];
    for (const source of sources) {
      const [result] = await this.db
        .select({ count: count() })
        .from(friends)
        .where(and(eq(friends.tenantId, tenantId), eq(friends.trafficSourceId, source.id)));
      stats.push({ ...source, actualFriendCount: result?.count || 0 });
    }
    return stats;
  }

  async attributeFriend(friendId: string, sourceCode: string) {
    const [source] = await this.db
      .select()
      .from(trafficSources)
      .where(eq(trafficSources.code, sourceCode))
      .limit(1);
    if (!source) return;

    await this.db
      .update(friends)
      .set({ trafficSourceId: source.id })
      .where(eq(friends.id, friendId));

    await this.db
      .update(trafficSources)
      .set({ friendCount: sql`${trafficSources.friendCount} + 1` })
      .where(eq(trafficSources.id, source.id));
  }
}
