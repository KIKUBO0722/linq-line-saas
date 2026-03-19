import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { lineAccounts, webhookEvents } from '@line-saas/db';
import { LineService } from '../line/line.service';
import { FollowHandler } from './handlers/follow.handler';
import { UnfollowHandler } from './handlers/unfollow.handler';
import { MessageHandler } from './handlers/message.handler';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly lineService: LineService,
    private readonly followHandler: FollowHandler,
    private readonly unfollowHandler: UnfollowHandler,
    private readonly messageHandler: MessageHandler,
  ) {}

  async processWebhook(accountId: string, rawBody: Buffer, signature: string) {
    // Look up the LINE account
    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, accountId))
      .limit(1);

    if (!account) {
      this.logger.warn(`LINE account not found: ${accountId}`);
      return;
    }

    // Validate signature
    const isValid = this.lineService.validateWebhookSignature(
      rawBody,
      signature,
      account.channelSecret,
    );

    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for account ${accountId}`);
      return;
    }

    const body = JSON.parse(rawBody.toString());
    const events = body.events || [];

    for (const event of events) {
      await this.processEvent(event, account);
    }
  }

  private async processEvent(event: any, account: typeof lineAccounts.$inferSelect) {
    // Store raw event
    await this.db.insert(webhookEvents).values({
      tenantId: account.tenantId,
      lineAccountId: account.id,
      eventType: event.type,
      lineEventId: event.webhookEventId,
      sourceUserId: event.source?.userId,
      payload: event,
    });

    const credentials = {
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    };

    // Dispatch by event type
    switch (event.type) {
      case 'follow':
        await this.followHandler.handle(event, account, credentials);
        break;
      case 'unfollow':
        await this.unfollowHandler.handle(event, account);
        break;
      case 'message':
        await this.messageHandler.handle(event, account, credentials);
        break;
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }
}
