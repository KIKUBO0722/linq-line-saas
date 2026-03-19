import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
