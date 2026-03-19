import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { LineModule } from './modules/line/line.module';
import { FriendsModule } from './modules/friends/friends.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AiModule } from './modules/ai/ai.module';
import { StepsModule } from './modules/steps/steps.module';
import { FormsModule } from './modules/forms/forms.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TagsModule } from './modules/tags/tags.module';
import { ReferralModule } from './modules/referral/referral.module';
import { BillingModule } from './modules/billing/billing.module';
import { MessagesModule } from './modules/messages/messages.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    LineModule,
    AuthModule,
    AccountsModule,
    AiModule,
    StepsModule,
    FormsModule,
    AnalyticsModule,
    TagsModule,
    ReferralModule,
    BillingModule,
    MessagesModule,
    WebhookModule,
    FriendsModule,
  ],
})
export class AppModule {}
