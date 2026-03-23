import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { lineAccounts, tenants } from '@line-saas/db';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {}

  async create(tenantId: string, data: { channelId: string; channelSecret: string; channelAccessToken: string; botName?: string }) {
    const webhookUrl = `${this.config.get('API_URL')}/webhook`;

    const [account] = await this.db
      .insert(lineAccounts)
      .values({
        tenantId,
        channelId: data.channelId,
        channelSecret: data.channelSecret,
        channelAccessToken: data.channelAccessToken,
        botName: data.botName,
      })
      .returning();

    // Return account with webhook URL for the user to set in LINE Developers
    return {
      ...account,
      webhookUrl: `${webhookUrl}/${account.id}`,
    };
  }

  async findByTenant(tenantId: string) {
    return this.db.select().from(lineAccounts).where(eq(lineAccounts.tenantId, tenantId));
  }

  async findById(id: string) {
    const [account] = await this.db.select().from(lineAccounts).where(eq(lineAccounts.id, id)).limit(1);
    return account;
  }

  async delete(tenantId: string, id: string) {
    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.id, id), eq(lineAccounts.tenantId, tenantId)))
      .limit(1);

    if (!account) {
      throw new ForbiddenException('アカウントが見つかりません');
    }

    await this.db.delete(lineAccounts).where(and(eq(lineAccounts.id, id), eq(lineAccounts.tenantId, tenantId)));
    return { success: true };
  }

  // --- Branding ---

  async getBranding(tenantId: string) {
    const [tenant] = await this.db
      .select({
        appName: tenants.appName,
        logoUrl: tenants.logoUrl,
        primaryColor: tenants.primaryColor,
        sidebarColor: tenants.sidebarColor,
        faviconUrl: tenants.faviconUrl,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return tenant || {};
  }

  async updateBranding(tenantId: string, data: {
    appName?: string;
    logoUrl?: string;
    primaryColor?: string;
    sidebarColor?: string;
    faviconUrl?: string;
  }) {
    try {
      const [updated] = await this.db
        .update(tenants)
        .set({
          appName: data.appName,
          logoUrl: data.logoUrl,
          primaryColor: data.primaryColor,
          sidebarColor: data.sidebarColor,
          faviconUrl: data.faviconUrl,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning({
          appName: tenants.appName,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          sidebarColor: tenants.sidebarColor,
          faviconUrl: tenants.faviconUrl,
        });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update branding', error);
      throw error;
    }
  }
}
