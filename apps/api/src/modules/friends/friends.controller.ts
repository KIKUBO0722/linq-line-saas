import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req, Res, UseGuards, Logger, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { ImportCsvDto, AssignTagDto, UpdateChatStatusDto } from './dto/friends.dto';
import { LineService } from '../line/line.service';
import { TagsService } from '../tags/tags.service';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { Inject } from '@nestjs/common';
import { lineAccounts } from '@line-saas/db';
import { eq, and } from 'drizzle-orm';

interface LineProfile {
  displayName?: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

@ApiTags('Friends')
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
    @TenantId() tenantId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.friendsService.findByTenant(tenantId, {
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('sync')
  async syncFollowers(@TenantId() tenantId: string) {
    const accounts = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.tenantId, tenantId), eq(lineAccounts.isActive, true)));

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
          let profile: LineProfile | null = null;
          try {
            profile = await this.lineService.getProfile(credentials, userId);
          } catch {
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
  async exportCsv(@TenantId() tenantId: string, @Res() res: { setHeader: (k: string, v: string) => void; send: (d: string) => void }) {
    const friends = await this.friendsService.findByTenant(tenantId, { limit: 10000 });
    await this.tagsService.list(tenantId);

    const friendList = Array.isArray(friends) ? friends : [];
    const friendTagMap: Record<string, string[]> = {};
    for (const f of friendList) {
      const fTags = await this.tagsService.listForFriend(f.id);
      friendTagMap[f.id] = fTags.map((t: { tag?: { name: string }; name?: string }) => t.tag?.name || t.name || '');
    }

    const header = 'ID,表示名,LINE ID,フォロー中,スコア,タグ,対応状況,言語,流入元,登録日\n';
    const rows = friendList.map((f: Record<string, unknown>) => {
      const tagStr = (friendTagMap[f.id as string] || []).join('|');
      return `${f.id},"${((f.displayName as string) || '').replace(/"/g, '""')}",${f.lineUserId},${f.isFollowing ? 'はい' : 'いいえ'},${(f.score as number) ?? 0},"${tagStr}",${(f.chatStatus as string) || 'unread'},${(f.language as string) || ''},${(f.acquisitionSource as string) || ''},${f.createdAt}`;
    }).join('\n');

    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=friends_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(bom + header + rows);
  }

  @Post('import/csv')
  async importCsv(@TenantId() tenantId: string, @Body() body: ImportCsvDto) {
    return this.friendsService.importFromCsv(tenantId, body.csv, this.tagsService);
  }

  @Get('custom-field-definitions')
  async getCustomFieldDefinitions(@TenantId() tenantId: string) {
    return this.friendsService.getCustomFieldDefinitions(tenantId);
  }

  @Get(':id')
  async getById(@TenantId() tenantId: string, @Param('id') id: string) {
    const friend = await this.friendsService.findById(id, tenantId);
    if (!friend) throw new NotFoundException('友だちが見つかりません');
    return friend;
  }

  @Get(':id/tags')
  async listTags(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.friendsService.findByIdOrThrow(id, tenantId);
    return this.tagsService.listForFriend(id);
  }

  @Post(':id/tags')
  async assignTag(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: AssignTagDto) {
    await this.friendsService.findByIdOrThrow(id, tenantId);
    await this.tagsService.verifyOwnership(body.tagId, tenantId);
    await this.tagsService.assignToFriend(id, body.tagId);
    return { success: true };
  }

  @Delete(':id/tags/:tagId')
  async removeTag(@TenantId() tenantId: string, @Param('id') id: string, @Param('tagId') tagId: string) {
    await this.friendsService.findByIdOrThrow(id, tenantId);
    await this.tagsService.removeFromFriend(id, tagId);
    return { success: true };
  }

  @Patch(':id/custom-fields')
  async updateCustomFields(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await this.friendsService.updateCustomFields(id, body, tenantId);
    return { ok: true, customFields: result };
  }

  @Get(':id/timeline')
  async getTimeline(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    await this.friendsService.findByIdOrThrow(id, tenantId);
    return this.friendsService.getTimeline(
      tenantId,
      id,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Patch(':id/chat-status')
  async updateChatStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateChatStatusDto,
  ) {
    await this.friendsService.updateChatStatus(id, body.status, tenantId);
    return { ok: true };
  }
}
