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

  async getNumberOfMessageDeliveries(
    credentials: LineCredentials,
    date: string,
  ): Promise<{
    status: string;
    broadcast: number;
    targeting: number;
    autoResponse: number;
    welcomeResponse: number;
    chat: number;
    apiBroadcast: number;
    apiPush: number;
    apiMulticast: number;
    apiReply: number;
  }> {
    const client = this.getClient(credentials);
    return (client as any).getNumberOfMessageDeliveries(date);
  }

  async getFollowerIds(credentials: LineCredentials): Promise<string[]> {
    const client = this.getClient(credentials);
    const allIds: string[] = [];
    let start: string | undefined;

    do {
      const res = await client.getFollowers(start, 1000);
      allIds.push(...(res.userIds || []));
      start = res.next || undefined;
    } while (start);

    return allIds;
  }

  async createRichMenuAlias(
    credentials: LineCredentials,
    richMenuAliasId: string,
    richMenuId: string,
  ) {
    const client = this.getClient(credentials);
    return (client as any).createRichMenuAlias({ richMenuAliasId, richMenuId });
  }

  async updateRichMenuAlias(
    credentials: LineCredentials,
    richMenuAliasId: string,
    richMenuId: string,
  ) {
    const client = this.getClient(credentials);
    return (client as any).updateRichMenuAlias(richMenuAliasId, { richMenuId });
  }

  async deleteRichMenuAlias(
    credentials: LineCredentials,
    richMenuAliasId: string,
  ) {
    const client = this.getClient(credentials);
    return (client as any).deleteRichMenuAlias(richMenuAliasId);
  }

  async linkRichMenuToUser(
    credentials: LineCredentials,
    userId: string,
    richMenuId: string,
  ) {
    const client = this.getClient(credentials);
    return client.linkRichMenuIdToUser(userId, richMenuId);
  }

  async unlinkRichMenuFromUser(
    credentials: LineCredentials,
    userId: string,
  ) {
    const client = this.getClient(credentials);
    return client.unlinkRichMenuIdFromUser(userId);
  }
}
