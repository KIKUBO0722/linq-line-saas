import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { lineAccounts } from '@line-saas/db';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccountsService {
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
}
