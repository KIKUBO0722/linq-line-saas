import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { LineModule } from '../line/line.module';
import { FriendsModule } from '../friends/friends.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LineModule, FriendsModule, AuthModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
