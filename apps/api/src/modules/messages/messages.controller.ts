import { Controller, Get, Post, Body, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { BillingService } from '../billing/billing.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { SendTextDto, SendMessageDto, BroadcastMessageDto, BroadcastTextDto, TestSendDto } from './dto/messages.dto';

@Controller('api/v1/messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly billingService: BillingService,
  ) {}

  @Get('unread-summary')
  async unreadSummary(@TenantId() tenantId: string) {
    return this.messagesService.getUnreadSummary(tenantId);
  }

  @Post('read/:friendId')
  async markAsRead(@TenantId() tenantId: string, @Param('friendId') friendId: string) {
    await this.messagesService.markAsRead(tenantId, friendId);
    return { success: true };
  }

  @Get('conversation/:friendId')
  async conversation(@TenantId() tenantId: string, @Param('friendId') friendId: string) {
    return this.messagesService.getConversation(tenantId, friendId);
  }

  @Post('send')
  async send(@TenantId() tenantId: string, @Body() body: SendTextDto) {
    const check = await this.billingService.checkLimit(tenantId, 'messagesSent');
    if (!check.allowed) {
      throw new HttpException(
        `メッセージ送信数が上限（${check.limit}件/月）に達しました。プランをアップグレードしてください。`,
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.messagesService.sendToFriend(tenantId, body.friendId, body.text);
    await this.billingService.incrementUsage(tenantId, 'messagesSent', 1);
    return result;
  }

  @Post('send-message')
  async sendMessage(@TenantId() tenantId: string, @Body() body: SendMessageDto) {
    const check = await this.billingService.checkLimit(tenantId, 'messagesSent');
    if (!check.allowed) {
      throw new HttpException(
        `メッセージ送信数が上限（${check.limit}件/月）に達しました。プランをアップグレードしてください。`,
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.messagesService.sendMessageToFriend(
      tenantId,
      body.friendId,
      body.message,
    );
    await this.billingService.incrementUsage(tenantId, 'messagesSent', 1);
    return result;
  }

  @Post('broadcast-message')
  async broadcastMessage(@TenantId() tenantId: string, @Body() body: BroadcastMessageDto) {
    const check = await this.billingService.checkLimit(tenantId, 'messagesSent');
    if (!check.allowed) {
      throw new HttpException(
        `メッセージ送信数が上限（${check.limit}件/月）に達しました。プランをアップグレードしてください。`,
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.messagesService.broadcastMessage(tenantId, body.message);
    await this.billingService.incrementUsage(tenantId, 'messagesSent', 1);
    return result;
  }

  @Post('broadcast')
  async broadcast(@TenantId() tenantId: string, @Body() body: BroadcastTextDto) {
    const check = await this.billingService.checkLimit(tenantId, 'messagesSent');
    if (!check.allowed) {
      throw new HttpException(
        `メッセージ送信数が上限（${check.limit}件/月）に達しました。プランをアップグレードしてください。`,
        HttpStatus.FORBIDDEN,
      );
    }

    if (body.scheduledAt) {
      const scheduledDate = new Date(body.scheduledAt);
      if (scheduledDate > new Date()) {
        return this.messagesService.scheduleBroadcast(tenantId, body.text, scheduledDate);
      }
    }

    const result = await this.messagesService.broadcast(tenantId, body.text);
    await this.billingService.incrementUsage(tenantId, 'messagesSent', 1);
    return result;
  }

  @Post('test-send')
  async testSend(@TenantId() tenantId: string, @Body() body: TestSendDto) {
    return this.messagesService.testSend(tenantId, body.friendIds, body.message);
  }
}
