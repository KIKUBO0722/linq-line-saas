import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { RichMenusModule } from './modules/rich-menus/rich-menus.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { SegmentsModule } from './modules/segments/segments.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { GreetingsModule } from './modules/greetings/greetings.module';
import { GachaModule } from './modules/gacha/gacha.module';
import { ExitPopupsModule } from './modules/exit-popups/exit-popups.module';
import { AgencyModule } from './modules/agency/agency.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
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
    RichMenusModule,
    TemplatesModule,
    SegmentsModule,
    CouponsModule,
    ReservationsModule,
    GreetingsModule,
    GachaModule,
    ExitPopupsModule,
    AgencyModule,
  ],
})
export class AppModule {}
