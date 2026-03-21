import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesScheduler } from './messages.scheduler';
import { UrlTrackingService } from './url-tracking.service';
import { UrlTrackingController } from './url-tracking.controller';
import { LineModule } from '../line/line.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [LineModule, AuthModule, BillingModule],
  controllers: [MessagesController, UrlTrackingController],
  providers: [MessagesService, MessagesScheduler, UrlTrackingService],
  exports: [MessagesService, UrlTrackingService],
})
export class MessagesModule {}
