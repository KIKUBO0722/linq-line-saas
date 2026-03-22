import { Module } from '@nestjs/common';
import { ExitPopupsController } from './exit-popups.controller';
import { ExitPopupsService } from './exit-popups.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ExitPopupsController],
  providers: [ExitPopupsService],
  exports: [ExitPopupsService],
})
export class ExitPopupsModule {}
