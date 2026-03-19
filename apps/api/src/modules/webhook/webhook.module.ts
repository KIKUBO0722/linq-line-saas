import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { LineModule } from '../line/line.module';
import { FriendsModule } from '../friends/friends.module';
import { AiModule } from '../ai/ai.module';
import { StepsModule } from '../steps/steps.module';
import { FollowHandler } from './handlers/follow.handler';
import { UnfollowHandler } from './handlers/unfollow.handler';
import { MessageHandler } from './handlers/message.handler';

@Module({
  imports: [LineModule, FriendsModule, AiModule, StepsModule],
  controllers: [WebhookController],
  providers: [WebhookService, FollowHandler, UnfollowHandler, MessageHandler],
})
export class WebhookModule {}
