import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsScheduler } from './friends.scheduler';
import { FriendsController } from './friends.controller';
import { AuthModule } from '../auth/auth.module';
import { LineModule } from '../line/line.module';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [AuthModule, LineModule, TagsModule],
  providers: [FriendsService, FriendsScheduler],
  controllers: [FriendsController],
  exports: [FriendsService],
})
export class FriendsModule {}
