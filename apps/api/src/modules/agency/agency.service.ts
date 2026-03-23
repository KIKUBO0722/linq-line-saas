import { Injectable, Inject, Logger, ForbiddenException, NotFoundException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, sql, and, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { tenants, friends, messages, subscriptions, plans, agencyMargins, agencyCommissions } from '@line-saas/db';

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

  // --- Margin Management ---

  /**
   * Get margin settings for a specific client
   */
  async getMargin(agencyTenantId: string, clientTenantId: string) {
    const [margin] = await this.db
      .select()
      .from(agencyMargins)
      .where(and(
        eq(agencyMargins.agencyTenantId, agencyTenantId),
        eq(agencyMargins.clientTenantId, clientTenantId),
      ))
      .limit(1);
    return margin || { marginType: 'percentage', marginValue: '20', notes: null };
  }

  /**
   * Get all margin settings for an agency
   */
  async listMargins(agencyTenantId: string) {
    try {
      const margins = await this.db
        .select({
          clientTenantId: agencyMargins.clientTenantId,
          clientName: tenants.name,
          marginType: agencyMargins.marginType,
          marginValue: agencyMargins.marginValue,
          notes: agencyMargins.notes,
          updatedAt: agencyMargins.updatedAt,
        })
        .from(agencyMargins)
        .innerJoin(tenants, eq(tenants.id, agencyMargins.clientTenantId))
        .where(eq(agencyMargins.agencyTenantId, agencyTenantId));
      return margins;
    } catch (error) {
      this.logger.error(`Failed to list margins: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  /**
   * Set margin for a client
   */
  async setMargin(agencyTenantId: string, clientTenantId: string, data: { marginType: string; marginValue: number; notes?: string }) {
    try {
      // Verify client belongs to this agency
      const [client] = await this.db
        .select()
        .from(tenants)
        .where(and(eq(tenants.id, clientTenantId), eq(tenants.parentTenantId, agencyTenantId)))
        .limit(1);
      if (!client) throw new NotFoundException('クライアントが見つかりません');

      const existing = await this.db
        .select()
        .from(agencyMargins)
        .where(and(
          eq(agencyMargins.agencyTenantId, agencyTenantId),
          eq(agencyMargins.clientTenantId, clientTenantId),
        ))
        .limit(1);

      if (existing.length > 0) {
        await this.db
          .update(agencyMargins)
          .set({
            marginType: data.marginType,
            marginValue: String(data.marginValue),
            notes: data.notes || null,
            updatedAt: new Date(),
          })
          .where(eq(agencyMargins.id, existing[0].id));
      } else {
        await this.db
          .insert(agencyMargins)
          .values({
            agencyTenantId,
            clientTenantId,
            marginType: data.marginType,
            marginValue: String(data.marginValue),
            notes: data.notes || null,
          });
      }
      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to set margin: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  /**
   * Get commission history for the agency
   */
  async getCommissions(agencyTenantId: string) {
    try {
      const commissions = await this.db
        .select({
          id: agencyCommissions.id,
          clientTenantId: agencyCommissions.clientTenantId,
          clientName: tenants.name,
          period: agencyCommissions.period,
          clientRevenue: agencyCommissions.clientRevenue,
          commissionAmount: agencyCommissions.commissionAmount,
          marginType: agencyCommissions.marginType,
          marginValue: agencyCommissions.marginValue,
          status: agencyCommissions.status,
          createdAt: agencyCommissions.createdAt,
        })
        .from(agencyCommissions)
        .innerJoin(tenants, eq(tenants.id, agencyCommissions.clientTenantId))
        .where(eq(agencyCommissions.agencyTenantId, agencyTenantId))
        .orderBy(desc(agencyCommissions.createdAt));
      return commissions;
    } catch (error) {
      this.logger.error(`Failed to get commissions: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  /**
   * Get commission summary (total earned, pending, paid)
   */
  async getCommissionSummary(agencyTenantId: string) {
    try {
      const [summary] = await this.db
        .select({
          totalEarned: sql<number>`coalesce(sum(${agencyCommissions.commissionAmount}), 0)`,
          totalPending: sql<number>`coalesce(sum(case when ${agencyCommissions.status} = 'pending' then ${agencyCommissions.commissionAmount} else 0 end), 0)`,
          totalPaid: sql<number>`coalesce(sum(case when ${agencyCommissions.status} = 'paid' then ${agencyCommissions.commissionAmount} else 0 end), 0)`,
          totalClients: sql<number>`count(distinct ${agencyCommissions.clientTenantId})`,
        })
        .from(agencyCommissions)
        .where(eq(agencyCommissions.agencyTenantId, agencyTenantId));
      return {
        totalEarned: Number(summary.totalEarned),
        totalPending: Number(summary.totalPending),
        totalPaid: Number(summary.totalPaid),
        totalClients: Number(summary.totalClients),
      };
    } catch (error) {
      this.logger.error(`Failed to get commission summary: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
