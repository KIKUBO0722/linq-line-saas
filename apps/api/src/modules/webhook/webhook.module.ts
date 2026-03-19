import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { LineModule } from '../line/line.module';
import { FriendsModule } from '../friends/friends.module';
import { FollowHandler } from './handlers/follow.handler';
import { UnfollowHandler } from './handlers/unfollow.handler';
import { MessageHandler } from './handlers/message.handler';

@Module({
  imports: [LineModule, FriendsModule],
  controllers: [WebhookController],
  providers: [WebhookService, FollowHandler, UnfollowHandler, MessageHandler],
})
export class WebhookModule {}
