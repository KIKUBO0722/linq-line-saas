import { Module } from '@nestjs/common';
import { GreetingsController } from './greetings.controller';
import { GreetingsService } from './greetings.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GreetingsController],
  providers: [GreetingsService],
  exports: [GreetingsService],
})
export class GreetingsModule {}
