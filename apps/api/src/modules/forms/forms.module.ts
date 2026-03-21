import { Module } from '@nestjs/common';
import { FormsController } from './forms.controller';
import { PublicFormsController } from './public-forms.controller';
import { FormsService } from './forms.service';
import { AuthModule } from '../auth/auth.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [AuthModule, FriendsModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
