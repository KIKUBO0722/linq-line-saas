import { Module } from '@nestjs/common';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { AuthModule } from '../auth/auth.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [AuthModule, LineModule],
  controllers: [SegmentsController],
  providers: [SegmentsService],
  exports: [SegmentsService],
})
export class SegmentsModule {}
