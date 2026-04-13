import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { friends, messages, webhookEvents, analyticsEvents, lineAccounts, trafficSources, trackedUrls, urlClicks, tags, friendTags, broadcasts, broadcastStats } from '@line-saas/db';
import { LineService } from '../line/line.service';

/** Raw row shape from cohort analysis SQL query */
interface CohortRow {
  cohort_week: string;
  cohort_size: string;
  week0: string;
  week1: string;
  week2: string;
  week3: string;
  week4: string;
}

/** Raw row shape from pseudo-CTR daily SQL query */
interface PseudoCtrRow {
  date: string;
  total_clicks: string;
  total_urls: string;
  clicks_per_url: string;
}

/** Raw row shape from best send time SQL query */
interface BestSendTimeRow {
  send_hour: string;
  sent_count: string;
  response_count: string;
  response_rate: string;
}

/** Raw row shape from segment comparison SQL query */
interface SegmentComparisonRow {
  tag_id: string;
  tag_name: string;
  tag_color: string;
  friend_count: string;
  inbound_messages: string;
  outbound_messages: string;
  avg_inbound_per_friend: string;
  response_rate: string;
}

/** Result shape for delivery insight per account */
export interface DeliveryInsightResult {
  accountId: string;
  botName: string | null;
  date: string;
  status?: string;
  error?: string;
  [key: string]: unknown;
}

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

    const results: DeliveryInsightResult[] = [];
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to get delivery insight for account ${account.id}: ${message}`);
        results.push({
          accountId: account.id,
          botName: account.botName,
          date,
          status: 'error',
          error: message,
        });
      }
    }

    return results;
  }

  async trackEvent(tenantId: string, eventName: string, friendId?: string, metadata?: Record<string, unknown>) {
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

  // --- Advanced Analytics ---

  /**
   * コホート分析: 週次リテンション
   * 友だち追加週ごとにグループ化し、その後のメッセージ送信率を計算
   */
  async getCohortAnalysis(tenantId: string, weeks: number = 8) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - weeks * 7);

      const result = await this.db.execute(sql`
        WITH cohorts AS (
          SELECT
            f.id as friend_id,
            date_trunc('week', f.created_at AT TIME ZONE 'Asia/Tokyo')::date as cohort_week
          FROM friends f
          WHERE f.tenant_id = ${tenantId}
            AND f.created_at >= ${startDate}
        ),
        activity AS (
          SELECT
            m.friend_id,
            date_trunc('week', m.created_at AT TIME ZONE 'Asia/Tokyo')::date as activity_week
          FROM messages m
          WHERE m.tenant_id = ${tenantId}
            AND m.direction = 'inbound'
            AND m.created_at >= ${startDate}
        )
        SELECT
          c.cohort_week,
          COUNT(DISTINCT c.friend_id) as cohort_size,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week THEN c.friend_id END) as week0,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + interval '1 week' THEN c.friend_id END) as week1,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + interval '2 weeks' THEN c.friend_id END) as week2,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + interval '3 weeks' THEN c.friend_id END) as week3,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + interval '4 weeks' THEN c.friend_id END) as week4
        FROM cohorts c
        LEFT JOIN activity a ON a.friend_id = c.friend_id
        GROUP BY c.cohort_week
        ORDER BY c.cohort_week
      `);

      const rows = result as unknown as CohortRow[];
      return (rows || []).map((row: CohortRow) => ({
        cohortWeek: row.cohort_week,
        cohortSize: Number(row.cohort_size),
        retention: [
          { week: 0, active: Number(row.week0), rate: Number(row.cohort_size) > 0 ? Math.round(Number(row.week0) / Number(row.cohort_size) * 100) : 0 },
          { week: 1, active: Number(row.week1), rate: Number(row.cohort_size) > 0 ? Math.round(Number(row.week1) / Number(row.cohort_size) * 100) : 0 },
          { week: 2, active: Number(row.week2), rate: Number(row.cohort_size) > 0 ? Math.round(Number(row.week2) / Number(row.cohort_size) * 100) : 0 },
          { week: 3, active: Number(row.week3), rate: Number(row.cohort_size) > 0 ? Math.round(Number(row.week3) / Number(row.cohort_size) * 100) : 0 },
          { week: 4, active: Number(row.week4), rate: Number(row.cohort_size) > 0 ? Math.round(Number(row.week4) / Number(row.cohort_size) * 100) : 0 },
        ],
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Cohort analysis failed: ${message}`);
      return [];
    }
  }

  /**
   * 疑似CTR: URLクリック率
   * 配信メッセージ中のURL追跡リンクのクリック数から反応率を算出
   */
  async getPseudoCtr(tenantId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.db.execute(sql`
        SELECT
          date_trunc('day', tu.created_at AT TIME ZONE 'Asia/Tokyo')::date as date,
          SUM(tu.click_count) as total_clicks,
          COUNT(tu.id) as total_urls,
          CASE WHEN COUNT(tu.id) > 0
            THEN ROUND(SUM(tu.click_count)::numeric / COUNT(tu.id), 2)
            ELSE 0 END as clicks_per_url
        FROM tracked_urls tu
        WHERE tu.tenant_id = ${tenantId}
          AND tu.created_at >= ${startDate}
        GROUP BY 1
        ORDER BY 1
      `);

      // Overall summary
      const [summary] = await this.db
        .select({
          totalClicks: sql<number>`COALESCE(SUM(${trackedUrls.clickCount}), 0)`,
          totalUrls: count(),
        })
        .from(trackedUrls)
        .where(and(eq(trackedUrls.tenantId, tenantId), gte(trackedUrls.createdAt, startDate)));

      const [outboundCount] = await this.db
        .select({ total: count() })
        .from(messages)
        .where(and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'outbound'),
          gte(messages.createdAt, startDate),
        ));

      const totalSent = outboundCount?.total || 0;
      const totalClicks = Number(summary?.totalClicks) || 0;

      return {
        summary: {
          totalClicks,
          totalSent,
          overallCtr: totalSent > 0 ? Math.round(totalClicks / totalSent * 10000) / 100 : 0,
          totalTrackedUrls: summary?.totalUrls || 0,
        },
        daily: ((result as unknown as PseudoCtrRow[]) || []).map((row: PseudoCtrRow) => ({
          date: row.date,
          clicks: Number(row.total_clicks),
          urls: Number(row.total_urls),
          clicksPerUrl: Number(row.clicks_per_url),
        })),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Pseudo CTR calculation failed: ${message}`);
      return { summary: { totalClicks: 0, totalSent: 0, overallCtr: 0, totalTrackedUrls: 0 }, daily: [] };
    }
  }

  /**
   * ベスト配信時間: 時間帯別の応答率
   * アウトバウンドメッセージの送信時刻と、その後24時間以内の返信率を集計
   */
  async getBestSendTime(tenantId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.db.execute(sql`
        WITH outbound AS (
          SELECT id, friend_id, created_at,
            EXTRACT(hour FROM created_at AT TIME ZONE 'Asia/Tokyo')::int as send_hour,
            EXTRACT(dow FROM created_at AT TIME ZONE 'Asia/Tokyo')::int as send_dow
          FROM messages
          WHERE tenant_id = ${tenantId}
            AND direction = 'outbound'
            AND created_at >= ${startDate}
        ),
        responses AS (
          SELECT DISTINCT ON (m_in.friend_id, o.id) o.id as outbound_id
          FROM outbound o
          JOIN messages m_in ON m_in.friend_id = o.friend_id
            AND m_in.direction = 'inbound'
            AND m_in.created_at > o.created_at
            AND m_in.created_at < o.created_at + interval '24 hours'
            AND m_in.tenant_id = ${tenantId}
        )
        SELECT
          o.send_hour,
          COUNT(o.id) as sent_count,
          COUNT(r.outbound_id) as response_count,
          CASE WHEN COUNT(o.id) > 0
            THEN ROUND(COUNT(r.outbound_id)::numeric / COUNT(o.id) * 100, 1)
            ELSE 0 END as response_rate
        FROM outbound o
        LEFT JOIN responses r ON r.outbound_id = o.id
        GROUP BY o.send_hour
        ORDER BY o.send_hour
      `);

      const hourly = ((result as unknown as BestSendTimeRow[]) || []).map((row: BestSendTimeRow) => ({
        hour: Number(row.send_hour),
        sentCount: Number(row.sent_count),
        responseCount: Number(row.response_count),
        responseRate: Number(row.response_rate),
      }));

      // Find best hours
      const sorted = [...hourly].sort((a, b) => b.responseRate - a.responseRate);
      const bestHours = sorted.filter(h => h.sentCount >= 5).slice(0, 3);

      return { hourly, bestHours };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Best send time analysis failed: ${message}`);
      return { hourly: [], bestHours: [] };
    }
  }

  /**
   * セグメント比較: タグ別のエンゲージメント指標
   */
  async getSegmentComparison(tenantId: string) {
    try {
      const result = await this.db.execute(sql`
        SELECT
          t.id as tag_id,
          t.name as tag_name,
          t.color as tag_color,
          COUNT(DISTINCT ft.friend_id) as friend_count,
          COUNT(DISTINCT m_in.id) as inbound_messages,
          COUNT(DISTINCT m_out.id) as outbound_messages,
          CASE WHEN COUNT(DISTINCT ft.friend_id) > 0
            THEN ROUND(COUNT(DISTINCT m_in.id)::numeric / COUNT(DISTINCT ft.friend_id), 1)
            ELSE 0 END as avg_inbound_per_friend,
          CASE WHEN COUNT(DISTINCT m_out.id) > 0
            THEN ROUND(COUNT(DISTINCT m_in.id)::numeric / NULLIF(COUNT(DISTINCT m_out.id), 0) * 100, 1)
            ELSE 0 END as response_rate
        FROM tags t
        LEFT JOIN friend_tags ft ON ft.tag_id = t.id
        LEFT JOIN messages m_in ON m_in.friend_id = ft.friend_id
          AND m_in.direction = 'inbound'
          AND m_in.tenant_id = ${tenantId}
        LEFT JOIN messages m_out ON m_out.friend_id = ft.friend_id
          AND m_out.direction = 'outbound'
          AND m_out.tenant_id = ${tenantId}
        WHERE t.tenant_id = ${tenantId}
        GROUP BY t.id, t.name, t.color
        ORDER BY friend_count DESC
      `);

      const rows = result as unknown as SegmentComparisonRow[];
      return (rows || []).map((row: SegmentComparisonRow) => ({
        tagId: row.tag_id,
        tagName: row.tag_name,
        tagColor: row.tag_color,
        friendCount: Number(row.friend_count),
        inboundMessages: Number(row.inbound_messages),
        outboundMessages: Number(row.outbound_messages),
        avgInboundPerFriend: Number(row.avg_inbound_per_friend),
        responseRate: Number(row.response_rate),
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Segment comparison failed: ${message}`);
      return [];
    }
  }

  /**
   * 前月比を含むKPIサマリー
   */
  async getKpiWithComparison(tenantId: string) {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // This month friends
      const [thisMonthFriends] = await this.db.select({ total: count() }).from(friends)
        .where(and(eq(friends.tenantId, tenantId), gte(friends.createdAt, thisMonthStart)));
      const [lastMonthFriends] = await this.db.select({ total: count() }).from(friends)
        .where(and(eq(friends.tenantId, tenantId), gte(friends.createdAt, lastMonthStart), lte(friends.createdAt, lastMonthEnd)));

      // This month messages
      const [thisMonthMsgs] = await this.db.select({ total: count() }).from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.direction, 'outbound'), gte(messages.createdAt, thisMonthStart)));
      const [lastMonthMsgs] = await this.db.select({ total: count() }).from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.direction, 'outbound'), gte(messages.createdAt, lastMonthStart), lte(messages.createdAt, lastMonthEnd)));

      // This month inbound (responses)
      const [thisMonthResponses] = await this.db.select({ total: count() }).from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.direction, 'inbound'), gte(messages.createdAt, thisMonthStart)));
      const [lastMonthResponses] = await this.db.select({ total: count() }).from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.direction, 'inbound'), gte(messages.createdAt, lastMonthStart), lte(messages.createdAt, lastMonthEnd)));

      // Total friends
      const [totalFriends] = await this.db.select({ total: count() }).from(friends)
        .where(and(eq(friends.tenantId, tenantId), eq(friends.isFollowing, true)));

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round((current - previous) / previous * 100);
      };

      return {
        totalFriends: totalFriends?.total || 0,
        newFriends: {
          current: thisMonthFriends?.total || 0,
          previous: lastMonthFriends?.total || 0,
          change: calcChange(thisMonthFriends?.total || 0, lastMonthFriends?.total || 0),
        },
        messagesSent: {
          current: thisMonthMsgs?.total || 0,
          previous: lastMonthMsgs?.total || 0,
          change: calcChange(thisMonthMsgs?.total || 0, lastMonthMsgs?.total || 0),
        },
        responses: {
          current: thisMonthResponses?.total || 0,
          previous: lastMonthResponses?.total || 0,
          change: calcChange(thisMonthResponses?.total || 0, lastMonthResponses?.total || 0),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`KPI comparison failed: ${message}`);
      return { totalFriends: 0, newFriends: { current: 0, previous: 0, change: 0 }, messagesSent: { current: 0, previous: 0, change: 0 }, responses: { current: 0, previous: 0, change: 0 } };
    }
  }

  /**
   * 友だちの健康指標: 純増数・ブロック率・アクティブ率・反応率
   * 現在期間 vs 前期間の比較付き
   */
  async getHealthMetrics(tenantId: string, days: number = 30) {
    try {
      const now = new Date();
      const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const previousStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

      // Total following friends
      const [totalFollowing] = await this.db
        .select({ total: count() })
        .from(friends)
        .where(and(eq(friends.tenantId, tenantId), eq(friends.isFollowing, true)));

      const [totalFriends] = await this.db
        .select({ total: count() })
        .from(friends)
        .where(eq(friends.tenantId, tenantId));

      // New friends in current period
      const [newCurrent] = await this.db
        .select({ total: count() })
        .from(friends)
        .where(and(eq(friends.tenantId, tenantId), gte(friends.createdAt, currentStart)));

      const [newPrevious] = await this.db
        .select({ total: count() })
        .from(friends)
        .where(and(
          eq(friends.tenantId, tenantId),
          gte(friends.createdAt, previousStart),
          lte(friends.createdAt, currentStart),
        ));

      // Blocks in current period (unfollowedAt in range)
      const [blocksCurrent] = await this.db
        .select({ total: count() })
        .from(friends)
        .where(and(
          eq(friends.tenantId, tenantId),
          gte(friends.unfollowedAt, currentStart),
        ));

      const [blocksPrevious] = await this.db
        .select({ total: count() })
        .from(friends)
        .where(and(
          eq(friends.tenantId, tenantId),
          gte(friends.unfollowedAt, previousStart),
          lte(friends.unfollowedAt, currentStart),
        ));

      // Messages sent in current period
      const [sentCurrent] = await this.db
        .select({ total: count() })
        .from(messages)
        .where(and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'outbound'),
          gte(messages.createdAt, currentStart),
        ));

      const [sentPrevious] = await this.db
        .select({ total: count() })
        .from(messages)
        .where(and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'outbound'),
          gte(messages.createdAt, previousStart),
          lte(messages.createdAt, currentStart),
        ));

      // Messages received (inbound) in current period
      const [inboundCurrent] = await this.db
        .select({ total: count() })
        .from(messages)
        .where(and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'inbound'),
          gte(messages.createdAt, currentStart),
        ));

      const [inboundPrevious] = await this.db
        .select({ total: count() })
        .from(messages)
        .where(and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'inbound'),
          gte(messages.createdAt, previousStart),
          lte(messages.createdAt, currentStart),
        ));

      // Active friends: distinct friends with inbound messages in period
      const activeCurrentResult = await this.db
        .select({ total: sql<number>`COUNT(DISTINCT ${messages.friendId})` })
        .from(messages)
        .where(and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'inbound'),
          gte(messages.createdAt, currentStart),
        ));
      const activeCurrent = Number(activeCurrentResult[0]?.total) || 0;

      const activePreviousResult = await this.db
        .select({ total: sql<number>`COUNT(DISTINCT ${messages.friendId})` })
        .from(messages)
        .where(and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'inbound'),
          gte(messages.createdAt, previousStart),
          lte(messages.createdAt, currentStart),
        ));
      const activePrevious = Number(activePreviousResult[0]?.total) || 0;

      const totalFollow = totalFollowing?.total || 0;
      const totalAll = totalFriends?.total || 0;
      const newC = newCurrent?.total || 0;
      const newP = newPrevious?.total || 0;
      const blocksC = blocksCurrent?.total || 0;
      const blocksP = blocksPrevious?.total || 0;
      const sentC = sentCurrent?.total || 0;
      const sentP = sentPrevious?.total || 0;
      const inC = inboundCurrent?.total || 0;
      const inP = inboundPrevious?.total || 0;

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round((current - previous) / previous * 100);
      };

      const blockRateCurrent = sentC > 0 ? Math.round(blocksC / sentC * 10000) / 100 : 0;
      const blockRatePrevious = sentP > 0 ? Math.round(blocksP / sentP * 10000) / 100 : 0;
      const activeRateCurrent = totalFollow > 0 ? Math.round(activeCurrent / totalFollow * 10000) / 100 : 0;
      const activeRatePrevious = totalFollow > 0 ? Math.round(activePrevious / totalFollow * 10000) / 100 : 0;
      const responseRateCurrent = sentC > 0 ? Math.round(inC / sentC * 10000) / 100 : 0;
      const responseRatePrevious = sentP > 0 ? Math.round(inP / sentP * 10000) / 100 : 0;

      return {
        period: days,
        totalFollowing: totalFollow,
        totalFriends: totalAll,
        blocked: totalAll - totalFollow,
        netGrowth: {
          current: newC - blocksC,
          newFriends: newC,
          blocks: blocksC,
          previous: newP - blocksP,
          change: calcChange(newC - blocksC, newP - blocksP),
        },
        blockRate: {
          current: blockRateCurrent,
          blocks: blocksC,
          sent: sentC,
          previous: blockRatePrevious,
          change: calcChange(blockRateCurrent, blockRatePrevious),
        },
        activeRate: {
          current: activeRateCurrent,
          activeFriends: activeCurrent,
          totalFollowing: totalFollow,
          previous: activeRatePrevious,
          change: calcChange(activeRateCurrent, activeRatePrevious),
        },
        responseRate: {
          current: responseRateCurrent,
          inbound: inC,
          outbound: sentC,
          previous: responseRatePrevious,
          change: calcChange(responseRateCurrent, responseRatePrevious),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Health metrics failed: ${message}`);
      return {
        period: days,
        totalFollowing: 0, totalFriends: 0, blocked: 0,
        netGrowth: { current: 0, newFriends: 0, blocks: 0, previous: 0, change: 0 },
        blockRate: { current: 0, blocks: 0, sent: 0, previous: 0, change: 0 },
        activeRate: { current: 0, activeFriends: 0, totalFollowing: 0, previous: 0, change: 0 },
        responseRate: { current: 0, inbound: 0, outbound: 0, previous: 0, change: 0 },
      };
    }
  }

  /**
   * 意思決定アラート: 現在の指標を分析してアクションを提案
   */
  async getAlerts(tenantId: string) {
    try {
      // Compare last 7 days vs previous 7 days
      const metrics = await this.getHealthMetrics(tenantId, 7);
      const alerts: Array<{ type: 'danger' | 'warning' | 'success' | 'info'; title: string; message: string }> = [];

      // Block rate spike
      if (metrics.blockRate.current > 0 && metrics.blockRate.change > 50) {
        alerts.push({
          type: 'danger',
          title: 'ブロック率が急上昇',
          message: `ブロック率が前週比${metrics.blockRate.change}%増加（${metrics.blockRate.previous}%→${metrics.blockRate.current}%）。配信頻度を下げるか、コンテンツを見直してください`,
        });
      } else if (metrics.blockRate.current > 2) {
        alerts.push({
          type: 'warning',
          title: 'ブロック率が高め',
          message: `ブロック率${metrics.blockRate.current}%。業界平均は1-2%です。配信内容の最適化を検討してください`,
        });
      }

      // Net growth negative
      if (metrics.netGrowth.current < 0) {
        alerts.push({
          type: 'danger',
          title: '友だち純減',
          message: `この7日間で${Math.abs(metrics.netGrowth.current)}人純減（新規${metrics.netGrowth.newFriends}人 - ブロック${metrics.netGrowth.blocks}人）。獲得施策の強化が必要です`,
        });
      } else if (metrics.netGrowth.current > 0 && metrics.netGrowth.change > 20) {
        alerts.push({
          type: 'success',
          title: '友だち順調に増加',
          message: `前週比${metrics.netGrowth.change}%の成長（純増${metrics.netGrowth.current}人）`,
        });
      }

      // Active rate drop
      if (metrics.activeRate.previous > 0 && metrics.activeRate.change < -30) {
        alerts.push({
          type: 'warning',
          title: 'アクティブ率が低下',
          message: `アクティブ率が前週比${Math.abs(metrics.activeRate.change)}%低下（${metrics.activeRate.previous}%→${metrics.activeRate.current}%）。再エンゲージメント施策を検討してください`,
        });
      }

      // Response rate insights
      if (metrics.responseRate.current > 0 && metrics.responseRate.change > 20) {
        alerts.push({
          type: 'success',
          title: '反応率が改善',
          message: `反応率が前週比${metrics.responseRate.change}%改善（${metrics.responseRate.previous}%→${metrics.responseRate.current}%）。配信内容が効果的です`,
        });
      } else if (metrics.responseRate.previous > 0 && metrics.responseRate.change < -30) {
        alerts.push({
          type: 'warning',
          title: '反応率が低下',
          message: `反応率が前週比${Math.abs(metrics.responseRate.change)}%低下。配信時間帯やコンテンツの見直しを検討してください`,
        });
      }

      // Best send time hint
      const bestTime = await this.getBestSendTime(tenantId, 14);
      if (bestTime.bestHours.length > 0) {
        const top = bestTime.bestHours[0];
        alerts.push({
          type: 'info',
          title: '最適な配信時間帯',
          message: `${top.hour}時台の反応率が${top.responseRate}%で最高。この時間帯に配信すると効果的です`,
        });
      }

      return alerts;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Alerts generation failed: ${message}`);
      return [];
    }
  }

  /**
   * 配信別パフォーマンス一覧
   * 各配信の送信数・反応率・クリック数・ブロック率を集計
   */
  async getBroadcastPerformanceList(tenantId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all broadcasts in period
      const broadcastList = await this.db
        .select()
        .from(broadcasts)
        .where(and(
          eq(broadcasts.tenantId, tenantId),
          gte(broadcasts.sentAt, startDate),
        ))
        .orderBy(desc(broadcasts.sentAt))
        .limit(50);

      if (broadcastList.length === 0) return [];

      const results = [];
      for (const bc of broadcastList) {
        // Check cached stats first
        const [cached] = await this.db
          .select()
          .from(broadcastStats)
          .where(eq(broadcastStats.broadcastId, bc.id));

        if (cached && cached.computedAt && (Date.now() - new Date(cached.computedAt).getTime()) < 3600000) {
          results.push({
            broadcastId: bc.id,
            type: bc.type,
            title: bc.title,
            contentPreview: bc.contentPreview,
            messageType: bc.messageType,
            sentAt: bc.sentAt,
            recipientCount: cached.recipientCount,
            responseCount: cached.responseCount,
            engagementRate: Number(cached.engagementRate),
            clickCount: cached.clickCount,
            clickerCount: cached.clickerCount,
            blockCount: cached.blockCount,
            blockRate: Number(cached.blockRate),
          });
          continue;
        }

        // Compute fresh stats
        const stats = await this.computeBroadcastStats(tenantId, bc.id, bc.sentAt);
        results.push({
          broadcastId: bc.id,
          type: bc.type,
          title: bc.title,
          contentPreview: bc.contentPreview,
          messageType: bc.messageType,
          sentAt: bc.sentAt,
          ...stats,
        });
      }

      return results;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Broadcast performance list failed: ${message}`);
      return [];
    }
  }

  /**
   * 特定配信の受信者別アクション詳細
   */
  async getBroadcastPerformanceDetail(tenantId: string, broadcastId: string) {
    try {
      const [bc] = await this.db
        .select()
        .from(broadcasts)
        .where(and(eq(broadcasts.id, broadcastId), eq(broadcasts.tenantId, tenantId)));

      if (!bc) return null;

      const stats = await this.computeBroadcastStats(tenantId, broadcastId, bc.sentAt);

      // Get recipients with their actions
      const recipientMessages = await this.db
        .select({
          friendId: messages.friendId,
          displayName: friends.displayName,
          isFollowing: friends.isFollowing,
          unfollowedAt: friends.unfollowedAt,
        })
        .from(messages)
        .leftJoin(friends, eq(messages.friendId, friends.id))
        .where(and(
          eq(messages.broadcastId, broadcastId),
          eq(messages.direction, 'outbound'),
        ))
        .limit(200);

      const sentAt = bc.sentAt ? new Date(bc.sentAt) : new Date(bc.createdAt);
      const responseWindow = new Date(sentAt.getTime() + 3 * 60 * 60 * 1000); // 3h
      const blockWindow = new Date(sentAt.getTime() + 48 * 60 * 60 * 1000);

      const recipients = [];
      for (const r of recipientMessages) {
        if (!r.friendId) continue;

        // Check if responded within 3h
        const [response] = await this.db
          .select({ id: messages.id, createdAt: messages.createdAt })
          .from(messages)
          .where(and(
            eq(messages.friendId, r.friendId),
            eq(messages.tenantId, tenantId),
            eq(messages.direction, 'inbound'),
            gte(messages.createdAt, sentAt),
            lte(messages.createdAt, responseWindow),
          ))
          .limit(1);

        // Check if blocked within 48h
        const blocked = r.unfollowedAt && !r.isFollowing
          && new Date(r.unfollowedAt) >= sentAt
          && new Date(r.unfollowedAt) <= blockWindow;

        recipients.push({
          friendId: r.friendId,
          displayName: r.displayName,
          responded: !!response,
          respondedAt: response?.createdAt || null,
          blocked: !!blocked,
          blockedAt: blocked ? r.unfollowedAt : null,
        });
      }

      return {
        broadcast: { broadcastId: bc.id, type: bc.type, title: bc.title, contentPreview: bc.contentPreview, messageType: bc.messageType, sentAt: bc.sentAt, ...stats },
        recipients,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Broadcast performance detail failed: ${message}`);
      return null;
    }
  }

  /**
   * 配信の集計を計算してキャッシュに保存
   */
  private async computeBroadcastStats(tenantId: string, broadcastId: string, sentAt: Date | null) {
    const bcSentAt = sentAt ? new Date(sentAt) : new Date();
    const responseWindow = new Date(bcSentAt.getTime() + 3 * 60 * 60 * 1000);
    const blockWindow = new Date(bcSentAt.getTime() + 48 * 60 * 60 * 1000);

    // Recipient count
    const [recipientResult] = await this.db
      .select({ total: count() })
      .from(messages)
      .where(and(eq(messages.broadcastId, broadcastId), eq(messages.direction, 'outbound')));
    const recipientCount = recipientResult?.total || 0;

    // Responses: distinct friends who sent inbound within 3h
    const responseResult = await this.db
      .select({ total: sql<number>`COUNT(DISTINCT ${messages.friendId})` })
      .from(messages)
      .where(and(
        eq(messages.tenantId, tenantId),
        eq(messages.direction, 'inbound'),
        gte(messages.createdAt, bcSentAt),
        lte(messages.createdAt, responseWindow),
        sql`${messages.friendId} IN (SELECT friend_id FROM messages WHERE broadcast_id = ${broadcastId} AND direction = 'outbound')`,
      ));
    const responseCount = Number(responseResult[0]?.total) || 0;

    // URL clicks linked to this broadcast's messages
    const clickResult = await this.db.execute(sql`
      SELECT
        COALESCE(SUM(tu.click_count), 0) as total_clicks,
        COUNT(DISTINCT uc.friend_id) as unique_clickers
      FROM tracked_urls tu
      LEFT JOIN url_clicks uc ON uc.tracked_url_id = tu.id
      WHERE tu.message_id IN (
        SELECT id FROM messages WHERE broadcast_id = ${broadcastId} AND direction = 'outbound'
      )
    `);
    const clickRow = (clickResult as unknown as Array<{ total_clicks: string; unique_clickers: string }>)[0];
    const clickCount = Number(clickRow?.total_clicks) || 0;
    const clickerCount = Number(clickRow?.unique_clickers) || 0;

    // Blocks: recipients who unfollowed within 48h
    const blockResult = await this.db.execute(sql`
      SELECT COUNT(*) as block_count FROM friends f
      WHERE f.id IN (SELECT friend_id FROM messages WHERE broadcast_id = ${broadcastId} AND direction = 'outbound')
        AND f.is_following = false
        AND f.unfollowed_at >= ${bcSentAt}
        AND f.unfollowed_at <= ${blockWindow}
    `);
    const blockCount = Number((blockResult as unknown as Array<{ block_count: string }>)[0]?.block_count) || 0;

    const engagementRate = recipientCount > 0 ? Math.round((responseCount + clickerCount) / recipientCount * 10000) / 100 : 0;
    const blockRate = recipientCount > 0 ? Math.round(blockCount / recipientCount * 10000) / 100 : 0;

    // Upsert cache
    try {
      await this.db
        .insert(broadcastStats)
        .values({ broadcastId, recipientCount, responseCount, clickCount, clickerCount, blockCount, engagementRate: String(engagementRate), blockRate: String(blockRate), computedAt: new Date() })
        .onConflictDoUpdate({
          target: broadcastStats.broadcastId,
          set: { recipientCount, responseCount, clickCount, clickerCount, blockCount, engagementRate: String(engagementRate), blockRate: String(blockRate), computedAt: new Date() },
        });
    } catch {
      // Cache write failure is non-critical
    }

    return { recipientCount, responseCount, engagementRate, clickCount, clickerCount, blockCount, blockRate };
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
