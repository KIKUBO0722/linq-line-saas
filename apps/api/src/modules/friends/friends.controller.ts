import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req, Res, UseGuards, Logger } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { LineService } from '../line/line.service';
import { TagsService } from '../tags/tags.service';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { Inject } from '@nestjs/common';
import { lineAccounts } from '@line-saas/db';
import { eq, and } from 'drizzle-orm';

@Controller('api/v1/friends')
@UseGuards(AuthGuard)
export class FriendsController {
  private readonly logger = new Logger(FriendsController.name);

  constructor(
    private readonly friendsService: FriendsService,
    private readonly lineService: LineService,
    private readonly tagsService: TagsService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.friendsService.findByTenant(req.tenantId, {
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('sync')
  async syncFollowers(@Req() req: any) {
    const accounts = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.tenantId, req.tenantId), eq(lineAccounts.isActive, true)));

    let synced = 0;

    for (const account of accounts) {
      const credentials = {
        channelSecret: account.channelSecret,
        channelAccessToken: account.channelAccessToken,
      };

      try {
        const followerIds = await this.lineService.getFollowerIds(credentials);
        this.logger.log(`Found ${followerIds.length} followers for account ${account.id}`);

        for (const userId of followerIds) {
          let profile: any = null;
          try {
            profile = await this.lineService.getProfile(credentials, userId);
          } catch (e) {
            this.logger.warn(`Failed to get profile for ${userId}`);
          }

          await this.friendsService.upsertFriend({
            tenantId: account.tenantId,
            lineAccountId: account.id,
            lineUserId: userId,
            displayName: profile?.displayName || 'LINE User',
            pictureUrl: profile?.pictureUrl,
            statusMessage: profile?.statusMessage,
            language: profile?.language,
            isFollowing: true,
            followedAt: new Date(),
          });
          synced++;
        }
      } catch (error) {
        this.logger.error(`Sync failed for account ${account.id}: ${error}`);
      }
    }

    return { synced };
  }

  @Get('export/csv')
  async exportCsv(@Req() req: any, @Res() res: any) {
    const friends = await this.friendsService.findByTenant(req.tenantId, { limit: 10000 });
    const allTags = await this.tagsService.list(req.tenantId);

    // Get tags for each friend
    const friendList = Array.isArray(friends) ? friends : [];
    const friendTagMap: Record<string, string[]> = {};
    for (const f of friendList) {
      const fTags = await this.tagsService.listForFriend(f.id);
      friendTagMap[f.id] = fTags.map((t: any) => t.tag?.name || t.name || '');
    }

    const header = 'ID,表示名,LINE ID,フォロー中,スコア,タグ,対応状況,言語,流入元,登録日\n';
    const rows = friendList.map((f: any) => {
      const tagStr = (friendTagMap[f.id] || []).join('|');
      return `${f.id},"${(f.displayName || '').replace(/"/g, '""')}",${f.lineUserId},${f.isFollowing ? 'はい' : 'いいえ'},${f.score ?? 0},"${tagStr}",${f.chatStatus || 'unread'},${f.language || ''},${f.acquisitionSource || ''},${f.createdAt}`;
    }).join('\n');

    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=friends_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(bom + header + rows);
  }

  @Post('import/csv')
  async importCsv(@Req() req: any, @Body() body: { csv: string }) {
    const result = await this.friendsService.importFromCsv(
      req.tenantId,
      body.csv,
      this.tagsService,
    );
    return result;
  }

  @Get('custom-field-definitions')
  async getCustomFieldDefinitions(@Req() req: any) {
    return this.friendsService.getCustomFieldDefinitions(req.tenantId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.friendsService.findById(id);
  }

  @Get(':id/tags')
  async listTags(@Param('id') id: string) {
    return this.tagsService.listForFriend(id);
  }

  @Post(':id/tags')
  async assignTag(@Param('id') id: string, @Body() body: { tagId: string }) {
    await this.tagsService.assignToFriend(id, body.tagId);
    return { success: true };
  }

  @Delete(':id/tags/:tagId')
  async removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    await this.tagsService.removeFromFriend(id, tagId);
    return { success: true };
  }

  @Patch(':id/custom-fields')
  async updateCustomFields(@Param('id') id: string, @Body() body: Record<string, any>) {
    const result = await this.friendsService.updateCustomFields(id, body);
    return { ok: true, customFields: result };
  }

  @Patch(':id/chat-status')
  async updateChatStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    await this.friendsService.updateChatStatus(id, body.status, req.tenantId);
    return { ok: true };
  }
}
