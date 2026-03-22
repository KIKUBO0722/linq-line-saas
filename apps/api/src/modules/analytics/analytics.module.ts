import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ConversionController } from './conversion.controller';
import { ConversionService } from './conversion.service';
import { AuthModule } from '../auth/auth.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [AuthModule, LineModule],
  controllers: [AnalyticsController, ConversionController],
  providers: [AnalyticsService, ConversionService],
  exports: [AnalyticsService, ConversionService],
})
export class AnalyticsModule {}
