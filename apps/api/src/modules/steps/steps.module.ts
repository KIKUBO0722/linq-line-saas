import { Module } from '@nestjs/common';
import { StepsController } from './steps.controller';
import { StepsService } from './steps.service';
import { StepsScheduler } from './steps.scheduler';
import { AuthModule } from '../auth/auth.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [AuthModule, LineModule],
  controllers: [StepsController],
  providers: [StepsService, StepsScheduler],
  exports: [StepsService],
})
export class StepsModule {}
