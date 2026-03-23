import { Controller, Post, Param, Req, Res, Logger, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { WebhookService } from './webhook.service';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post(':accountId')
  async handleWebhook(
    @Param('accountId') accountId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Always return 200 to prevent LINE retry storms
    res.status(HttpStatus.OK).json({ status: 'ok' });

    try {
      const signature = req.headers['x-line-signature'] as string;
      const rawBody = (req as any).rawBody as Buffer;

      if (!signature || !rawBody) {
        this.logger.warn(`Missing signature or body for account ${accountId}`);
        return;
      }

      await this.webhookService.processWebhook(accountId, rawBody, signature);
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error}`, (error as Error).stack);
    }
  }
}
