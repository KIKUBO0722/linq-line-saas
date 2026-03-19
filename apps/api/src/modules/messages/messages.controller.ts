import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversation/:friendId')
  async conversation(@Req() req: any, @Param('friendId') friendId: string) {
    return this.messagesService.getConversation(req.tenantId, friendId);
  }

  @Post('send')
  async send(@Req() req: any, @Body() body: { friendId: string; text: string }) {
    return this.messagesService.sendToFriend(req.tenantId, body.friendId, body.text);
  }

  @Post('broadcast')
  async broadcast(@Req() req: any, @Body() body: { text: string }) {
    return this.messagesService.broadcast(req.tenantId, body.text);
  }
}
