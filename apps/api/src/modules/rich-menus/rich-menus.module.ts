import { Module } from '@nestjs/common';
import { RichMenusController } from './rich-menus.controller';
import { RichMenusService } from './rich-menus.service';
import { LineModule } from '../line/line.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LineModule, AuthModule],
  controllers: [RichMenusController],
  providers: [RichMenusService],
})
export class RichMenusModule {}
