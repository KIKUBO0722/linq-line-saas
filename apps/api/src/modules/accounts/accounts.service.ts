import { Injectable, Inject, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { messagingApi } from '@line/bot-sdk';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { lineAccounts, tenants } from '@line-saas/db';
import { ConfigService } from '@nestjs/config';

const { MessagingApiClient } = messagingApi;

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {}

  /**
   * Validate LINE credentials by calling the Bot Info API
   */
  private async validateLineCredentials(channelAccessToken: string): Promise<{ displayName: string; userId: string }> {
    try {
      const client = new MessagingApiClient({ channelAccessToken });
      const botInfo = await client.getBotInfo();
      return { displayName: botInfo.displayName, userId: botInfo.userId };
    } catch (error) {
      this.logger.error('LINE credential validation failed', error);
      throw new BadRequestException(
        'LINE APIの認証に失敗しました。チャネルアクセストークンが正しいか確認してください。',
      );
    }
  }

  async create(tenantId: string, data: { channelId: string; channelSecret: string; channelAccessToken: string; botName?: string }) {
    // 1. Validate credentials against LINE API
    const botInfo = await this.validateLineCredentials(data.channelAccessToken);

    // 2. Check for duplicate channelId
    const [existing] = await this.db
      .select({ id: lineAccounts.id })
      .from(lineAccounts)
      .where(eq(lineAccounts.channelId, data.channelId))
      .limit(1);

    if (existing) {
      throw new ConflictException('このチャネルIDは既に登録されています。');
    }

    // 3. Insert with validated bot name
    const webhookUrl = `${this.config.get('API_URL')}/webhook`;

    try {
      const [account] = await this.db
        .insert(lineAccounts)
        .values({
          tenantId,
          channelId: data.channelId,
          channelSecret: data.channelSecret,
          channelAccessToken: data.channelAccessToken,
          botName: data.botName || botInfo.displayName,
        })
        .returning();

      this.logger.log(`LINE account connected: ${botInfo.displayName} (${data.channelId}) for tenant ${tenantId}`);

      return {
        ...account,
        webhookUrl: `${webhookUrl}/${account.id}`,
      };
    } catch (error) {
      this.logger.error('Failed to create LINE account', error);
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('このチャネルIDは既に登録されています。');
      }
      throw new BadRequestException('アカウントの登録に失敗しました。入力内容を確認してください。');
    }
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
