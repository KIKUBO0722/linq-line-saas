import { Module } from '@nestjs/common';
import { StepsController } from './steps.controller';
import { StepsService } from './steps.service';
import { AuthModule } from '../auth/auth.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [AuthModule, LineModule],
  controllers: [StepsController],
  providers: [StepsService],
  exports: [StepsService],
})
export class StepsModule {}
