import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { AuthModule } from '../auth/auth.module';
import { LineModule } from '../line/line.module';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [AuthModule, LineModule, TagsModule],
  providers: [FriendsService],
  controllers: [FriendsController],
  exports: [FriendsService],
})
export class FriendsModule {}
