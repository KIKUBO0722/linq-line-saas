import { Controller, Get, Post, Body, Param, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { BillingService } from '../billing/billing.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly billingService: BillingService,
  ) {}

  @Get('conversation/:friendId')
  async conversation(@Req() req: any, @Param('friendId') friendId: string) {
    return this.messagesService.getConversation(req.tenantId, friendId);
  }

  @Post('send')
  async send(@Req() req: any, @Body() body: { friendId: string; text: string }) {
    const check = await this.billingService.checkLimit(req.tenantId, 'messagesSent');
    if (!check.allowed) {
      throw new HttpException(
        `メッセージ送信数が上限（${check.limit}件/月）に達しました。プランをアップグレードしてください。`,
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.messagesService.sendToFriend(req.tenantId, body.friendId, body.text);
    await this.billingService.incrementUsage(req.tenantId, 'messagesSent', 1);
    return result;
  }

  @Post('send-message')
  async sendMessage(
    @Req() req: any,
    @Body() body: {
      friendId: string;
      message: {
        type: 'text' | 'image' | 'video' | 'audio' | 'flex';
        text?: string;
        originalContentUrl?: string;
        previewImageUrl?: string;
        duration?: number;
        altText?: string;
        contents?: any;
        quickReply?: {
          items: Array<{
            type: 'action';
            action: { type: string; label: string; text?: string; uri?: string; data?: string };
          }>;
        };
      };
    },
  ) {
    const check = await this.billingService.checkLimit(req.tenantId, 'messagesSent');
    if (!check.allowed) {
      throw new HttpException(
        `メッセージ送信数が上限（${check.limit}件/月）に達しました。プランをアップグレードしてください。`,
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.messagesService.sendMessageToFriend(
      req.tenantId,
      body.friendId,
      body.message,
    );
    await this.billingService.incrementUsage(req.tenantId, 'messagesSent', 1);
    return result;
  }

  @Post('broadcast-message')
  async broadcastMessage(
    @Req() req: any,
    @Body() body: {
      message: {
        type: 'text' | 'image' | 'video' | 'audio' | 'flex';
        text?: string;
        originalContentUrl?: string;
        previewImageUrl?: string;
        duration?: number;
        altText?: string;
        contents?: any;
        quickReply?: {
          items: Array<{
            type: 'action';
            action: { type: string; label: string; text?: string; uri?: string; data?: string };
          }>;
        };
      };
      scheduledAt?: string;
    },
  ) {
    const check = await this.billingService.checkLimit(req.tenantId, 'messagesSent');
    if (!check.allowed) {
      throw new HttpException(
        `メッセージ送信数が上限（${check.limit}件/月）に達しました。プランをアップグレードしてください。`,
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.messagesService.broadcastMessage(req.tenantId, body.message);
    await this.billingService.incrementUsage(req.tenantId, 'messagesSent', 1);
    return result;
  }

  @Post('broadcast')
  async broadcast(@Req() req: any, @Body() body: { text: string; scheduledAt?: string }) {
    const check = await this.billingService.checkLimit(req.tenantId, 'messagesSent');
    if (!check.allowed) {
      throw new HttpException(
        `メッセージ送信数が上限（${check.limit}件/月）に達しました。プランをアップグレードしてください。`,
        HttpStatus.FORBIDDEN,
      );
    }

    if (body.scheduledAt) {
      const scheduledDate = new Date(body.scheduledAt);
      if (scheduledDate > new Date()) {
        return this.messagesService.scheduleBroadcast(req.tenantId, body.text, scheduledDate);
      }
    }

    const result = await this.messagesService.broadcast(req.tenantId, body.text);
    await this.billingService.incrementUsage(req.tenantId, 'messagesSent', 1);
    return result;
  }
}
