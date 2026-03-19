import { Injectable, Logger } from '@nestjs/common';
import { messagingApi, validateSignature } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

interface LineCredentials {
  channelSecret: string;
  channelAccessToken: string;
}

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private clients = new Map<string, InstanceType<typeof MessagingApiClient>>();

  getClient(credentials: LineCredentials): InstanceType<typeof MessagingApiClient> {
    const key = credentials.channelAccessToken.slice(0, 20);
    if (!this.clients.has(key)) {
      this.clients.set(key, new MessagingApiClient({ channelAccessToken: credentials.channelAccessToken }));
    }
    return this.clients.get(key)!;
  }

  validateWebhookSignature(body: Buffer, signature: string, channelSecret: string): boolean {
    return validateSignature(body, channelSecret, signature);
  }

  async replyMessage(
    credentials: LineCredentials,
    replyToken: string,
    messages: messagingApi.Message[],
  ) {
    const client = this.getClient(credentials);
    return client.replyMessage({ replyToken, messages });
  }

  async pushMessage(
    credentials: LineCredentials,
    to: string,
    messages: messagingApi.Message[],
  ) {
    const client = this.getClient(credentials);
    return client.pushMessage({ to, messages });
  }

  async multicast(
    credentials: LineCredentials,
    to: string[],
    messages: messagingApi.Message[],
  ) {
    const client = this.getClient(credentials);
    return client.multicast({ to, messages });
  }

  async broadcast(credentials: LineCredentials, messages: messagingApi.Message[]) {
    const client = this.getClient(credentials);
    return client.broadcast({ messages });
  }

  async getProfile(credentials: LineCredentials, userId: string) {
    const client = this.getClient(credentials);
    return client.getProfile(userId);
  }
}
