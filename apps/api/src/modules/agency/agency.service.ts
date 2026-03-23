import { Injectable, Inject, Logger, ForbiddenException } from '@nestjs/common';
import { eq, sql, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { tenants, friends, messages, subscriptions, plans } from '@line-saas/db';

export interface ClientSummary {
  tenantId: string;
  tenantName: string;
  industry: string | null;
  status: string;
  friendCount: number;
  messagesSent: number;
  messagesReceived: number;
  planName: string | null;
  createdAt: Date;
}

export interface AgencyOverview {
  totalClients: number;
  totalFriends: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  clients: ClientSummary[];
}

@Injectable()
export class AgencyService {
  private readonly logger = new Logger(AgencyService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Check if tenantId is an agency (has child tenants)
   */
  async isAgency(tenantId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(eq(tenants.parentTenantId, tenantId));
    return Number(result.count) > 0;
  }

  /**
   * Get list of child tenants for an agency
   */
  async getClients(tenantId: string): Promise<ClientSummary[]> {
    const childTenants = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.parentTenantId, tenantId))
      .orderBy(tenants.createdAt);

    const clients: ClientSummary[] = [];

    for (const child of childTenants) {
      const [friendStats] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(friends)
        .where(and(eq(friends.tenantId, child.id), eq(friends.isFollowing, true)));

      const [msgStats] = await this.db
        .select({
          sent: sql<number>`count(case when ${messages.direction} = 'outbound' then 1 end)`,
          received: sql<number>`count(case when ${messages.direction} = 'inbound' then 1 end)`,
        })
        .from(messages)
        .where(eq(messages.tenantId, child.id));

      const [sub] = await this.db
        .select({ planName: plans.name })
        .from(subscriptions)
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .where(eq(subscriptions.tenantId, child.id))
        .limit(1);

      clients.push({
        tenantId: child.id,
        tenantName: child.name,
        industry: child.industry,
        status: child.status,
        friendCount: Number(friendStats.count),
        messagesSent: Number(msgStats.sent),
        messagesReceived: Number(msgStats.received),
        planName: sub?.planName || 'free',
        createdAt: child.createdAt,
      });
    }

    return clients;
  }

  /**
   * Get aggregated overview for agency dashboard
   */
  async getOverview(tenantId: string): Promise<AgencyOverview> {
    const clients = await this.getClients(tenantId);

    return {
      totalClients: clients.length,
      totalFriends: clients.reduce((sum, c) => sum + c.friendCount, 0),
      totalMessagesSent: clients.reduce((sum, c) => sum + c.messagesSent, 0),
      totalMessagesReceived: clients.reduce((sum, c) => sum + c.messagesReceived, 0),
      clients,
    };
  }

  /**
   * Add an existing tenant as a client of this agency
   */
  async addClient(agencyTenantId: string, clientTenantId: string): Promise<void> {
    // Verify client isn't already under another agency
    const [client] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, clientTenantId))
      .limit(1);

    if (!client) throw new ForbiddenException('クライアントが見つかりません');
    if (client.parentTenantId && client.parentTenantId !== agencyTenantId) {
      throw new ForbiddenException('このクライアントは別の代理店に所属しています');
    }

    await this.db
      .update(tenants)
      .set({ parentTenantId: agencyTenantId })
      .where(eq(tenants.id, clientTenantId));
  }

  /**
   * Remove a client from agency
   */
  async removeClient(agencyTenantId: string, clientTenantId: string): Promise<void> {
    await this.db
      .update(tenants)
      .set({ parentTenantId: null })
      .where(and(eq(tenants.id, clientTenantId), eq(tenants.parentTenantId, agencyTenantId)));
  }
}
