import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { richMenus, richMenuGroups, lineAccounts, friends } from '@line-saas/db';
import { LineService } from '../line/line.service';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiBlobClient } = messagingApi;

@Injectable()
export class RichMenusService {
  private readonly logger = new Logger(RichMenusService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly lineService: LineService,
  ) {}

  async findByTenant(tenantId: string) {
    return this.db
      .select()
      .from(richMenus)
      .where(eq(richMenus.tenantId, tenantId))
      .orderBy(richMenus.createdAt);
  }

  async create(
    tenantId: string,
    data: {
      lineAccountId: string;
      name: string;
      chatBarText?: string;
      areas?: any[];
      size?: { width: number; height: number };
    },
  ) {
    // Verify account belongs to tenant
    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.id, data.lineAccountId), eq(lineAccounts.tenantId, tenantId)))
      .limit(1);

    if (!account) throw new Error('Account not found');

    const client = this.lineService.getClient({
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    });

    const size = data.size || { width: 2500, height: 1686 };
    const areas = (data.areas || []).map((area: any) => ({
      bounds: area.bounds || { x: 0, y: 0, width: size.width, height: size.height },
      action: area.action || { type: 'message', text: area.text || 'メニュー' },
    }));

    const richMenuAreas = areas.length > 0 ? areas : [
      {
        bounds: { x: 0, y: 0, width: size.width, height: size.height },
        action: { type: 'message' as const, text: 'メニュー' },
      },
    ];

    let lineRichMenuId: string | null = null;
    try {
      const result = await client.createRichMenu({
        size,
        selected: true,
        name: data.name,
        chatBarText: data.chatBarText || 'メニュー',
        areas: richMenuAreas,
      });
      lineRichMenuId = result.richMenuId;
    } catch (err) {
      this.logger.warn(`LINE API rich menu creation failed: ${err}`);
    }

    const [menu] = await this.db
      .insert(richMenus)
      .values({
        tenantId,
        lineAccountId: data.lineAccountId,
        name: data.name,
        lineRichMenuId,
        size,
        areas: richMenuAreas,
        chatBarText: data.chatBarText || 'メニュー',
        isActive: !!lineRichMenuId,
      })
      .returning();

    return menu;
  }

  async uploadImage(tenantId: string, id: string, imageBuffer: Buffer, contentType: string) {
    const [menu] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)))
      .limit(1);

    if (!menu) throw new Error('Rich menu not found');
    if (!menu.lineRichMenuId) throw new Error('Rich menu not synced with LINE');

    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, menu.lineAccountId))
      .limit(1);

    if (!account) throw new Error('Account not found');

    // Use blob client for image upload
    const blobClient = new MessagingApiBlobClient({
      channelAccessToken: account.channelAccessToken,
    });

    const uint8 = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8], { type: contentType });
    await blobClient.setRichMenuImage(menu.lineRichMenuId, blob);

    // Update DB to mark image as uploaded
    await this.db
      .update(richMenus)
      .set({ imageUrl: `line://richmenu/${menu.lineRichMenuId}` })
      .where(eq(richMenus.id, id));

    return { success: true };
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      chatBarText?: string;
      areas?: any[];
      size?: { width: number; height: number };
    },
  ) {
    const [menu] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)))
      .limit(1);

    if (!menu) throw new Error('Rich menu not found');

    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, menu.lineAccountId))
      .limit(1);

    if (!account) throw new Error('Account not found');

    const client = this.lineService.getClient({
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    });

    // LINE API doesn't support updating rich menus - must delete and recreate
    const wasDefault = menu.isDefault;
    const newSize = data.size || (menu.size as any) || { width: 2500, height: 1686 };
    const newAreas = data.areas || (menu.areas as any[]) || [];
    const newName = data.name || menu.name;
    const newChatBarText = data.chatBarText || menu.chatBarText || 'メニュー';

    // Delete old from LINE
    if (menu.lineRichMenuId) {
      try {
        await client.deleteRichMenu(menu.lineRichMenuId);
      } catch (err) {
        this.logger.warn(`Failed to delete old LINE rich menu: ${err}`);
      }
    }

    // Create new on LINE
    let lineRichMenuId: string | null = null;
    try {
      const result = await client.createRichMenu({
        size: newSize,
        selected: true,
        name: newName,
        chatBarText: newChatBarText,
        areas: newAreas,
      });
      lineRichMenuId = result.richMenuId;
    } catch (err) {
      this.logger.warn(`LINE API rich menu recreation failed: ${err}`);
    }

    // Restore default if it was default before
    if (wasDefault && lineRichMenuId) {
      try {
        await client.setDefaultRichMenu(lineRichMenuId);
      } catch (err) {
        this.logger.warn(`Failed to restore default: ${err}`);
      }
    }

    // Update DB
    const [updated] = await this.db
      .update(richMenus)
      .set({
        name: newName,
        chatBarText: newChatBarText,
        size: newSize,
        areas: newAreas,
        lineRichMenuId,
        isActive: !!lineRichMenuId,
        imageUrl: null, // Image needs to be re-uploaded
      })
      .where(eq(richMenus.id, id))
      .returning();

    return updated;
  }

  async delete(tenantId: string, id: string) {
    const [menu] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)))
      .limit(1);

    if (!menu) throw new Error('Rich menu not found');

    if (menu.lineRichMenuId) {
      try {
        const [account] = await this.db
          .select()
          .from(lineAccounts)
          .where(eq(lineAccounts.id, menu.lineAccountId))
          .limit(1);

        if (account) {
          const client = this.lineService.getClient({
            channelSecret: account.channelSecret,
            channelAccessToken: account.channelAccessToken,
          });
          await client.deleteRichMenu(menu.lineRichMenuId);
        }
      } catch (err) {
        this.logger.warn(`Failed to delete LINE rich menu: ${err}`);
      }
    }

    await this.db.delete(richMenus).where(eq(richMenus.id, id));
    return { success: true };
  }

  async setDefault(tenantId: string, id: string) {
    const [menu] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)))
      .limit(1);

    if (!menu) throw new Error('Rich menu not found');
    if (!menu.lineRichMenuId) throw new Error('Rich menu not synced with LINE');

    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, menu.lineAccountId))
      .limit(1);

    if (!account) throw new Error('Account not found');

    const client = this.lineService.getClient({
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    });

    await client.setDefaultRichMenu(menu.lineRichMenuId);

    await this.db
      .update(richMenus)
      .set({ isDefault: false })
      .where(eq(richMenus.lineAccountId, menu.lineAccountId));

    await this.db.update(richMenus).set({ isDefault: true }).where(eq(richMenus.id, id));

    return { success: true };
  }

  // Group CRUD
  async listGroups(tenantId: string) {
    const groups = await this.db
      .select()
      .from(richMenuGroups)
      .where(eq(richMenuGroups.tenantId, tenantId))
      .orderBy(richMenuGroups.createdAt);

    // For each group, fetch its menus
    const result = [];
    for (const group of groups) {
      const groupMenus = await this.db
        .select()
        .from(richMenus)
        .where(and(eq(richMenus.tenantId, tenantId), eq(richMenus.groupId, group.id)))
        .orderBy(richMenus.tabIndex);
      result.push({ ...group, menus: groupMenus });
    }
    return result;
  }

  async createGroup(
    tenantId: string,
    data: {
      lineAccountId: string;
      name: string;
      description?: string;
      tabs: Array<{
        name: string;
        chatBarText?: string;
        areas: any[];
        size?: { width: number; height: number };
      }>;
    },
  ) {
    // Verify account belongs to tenant
    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.id, data.lineAccountId), eq(lineAccounts.tenantId, tenantId)))
      .limit(1);

    if (!account) throw new Error('Account not found');

    const credentials = {
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    };

    // Create group record
    const [group] = await this.db
      .insert(richMenuGroups)
      .values({
        tenantId,
        lineAccountId: data.lineAccountId,
        name: data.name,
        description: data.description,
      })
      .returning();

    // Create each tab as a rich menu
    const createdMenus = [];
    for (let i = 0; i < data.tabs.length; i++) {
      const tab = data.tabs[i];
      const size = tab.size || { width: 2500, height: 1686 };
      const areas = tab.areas.length > 0 ? tab.areas : [
        { bounds: { x: 0, y: 0, width: size.width, height: size.height }, action: { type: 'message', text: 'メニュー' } },
      ];

      let lineRichMenuId: string | null = null;
      try {
        const result = await this.lineService.getClient(credentials).createRichMenu({
          size,
          selected: true,
          name: `${data.name} - ${tab.name}`,
          chatBarText: tab.chatBarText || 'メニュー',
          areas,
        });
        lineRichMenuId = result.richMenuId;
      } catch (err) {
        this.logger.warn(`Failed to create tab ${i} on LINE: ${err}`);
      }

      // Create alias for tab switching
      let lineAliasId: string | null = null;
      if (lineRichMenuId) {
        const aliasId = `richmenu-alias-${group.id}-tab${i}`;
        try {
          await this.lineService.createRichMenuAlias(credentials, aliasId, lineRichMenuId);
          lineAliasId = aliasId;
        } catch (err) {
          this.logger.warn(`Failed to create alias for tab ${i}: ${err}`);
        }
      }

      const [menu] = await this.db
        .insert(richMenus)
        .values({
          tenantId,
          lineAccountId: data.lineAccountId,
          name: tab.name,
          lineRichMenuId,
          lineAliasId,
          groupId: group.id,
          tabIndex: i,
          size,
          areas,
          chatBarText: tab.chatBarText || 'メニュー',
          isActive: !!lineRichMenuId,
        })
        .returning();

      createdMenus.push(menu);
    }

    return { ...group, menus: createdMenus };
  }

  async deleteGroup(tenantId: string, groupId: string) {
    // Get all menus in group
    const groupMenus = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.tenantId, tenantId), eq(richMenus.groupId, groupId)));

    // Delete each menu from LINE
    for (const menu of groupMenus) {
      if (menu.lineAliasId) {
        try {
          const [account] = await this.db
            .select()
            .from(lineAccounts)
            .where(eq(lineAccounts.id, menu.lineAccountId))
            .limit(1);
          if (account) {
            const creds = { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken };
            await this.lineService.deleteRichMenuAlias(creds, menu.lineAliasId);
          }
        } catch (err) {
          this.logger.warn(`Failed to delete alias: ${err}`);
        }
      }

      if (menu.lineRichMenuId) {
        try {
          const [account] = await this.db
            .select()
            .from(lineAccounts)
            .where(eq(lineAccounts.id, menu.lineAccountId))
            .limit(1);
          if (account) {
            const creds = { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken };
            const client = this.lineService.getClient(creds);
            await client.deleteRichMenu(menu.lineRichMenuId);
          }
        } catch (err) {
          this.logger.warn(`Failed to delete LINE rich menu: ${err}`);
        }
      }
    }

    // Delete menus from DB
    await this.db.delete(richMenus).where(eq(richMenus.groupId, groupId));
    // Delete group
    await this.db.delete(richMenuGroups).where(eq(richMenuGroups.id, groupId));

    return { success: true };
  }

  async setGroupDefault(tenantId: string, groupId: string) {
    // Get first tab of the group and set it as default
    const [firstTab] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.tenantId, tenantId), eq(richMenus.groupId, groupId), eq(richMenus.tabIndex, 0)))
      .limit(1);

    if (!firstTab || !firstTab.lineRichMenuId) throw new Error('Group has no synced tabs');

    // Use the existing setDefault method for the first tab
    return this.setDefault(tenantId, firstTab.id);
  }

  // Assign rich menu to user based on tags/segments
  async assignMenuToUser(
    tenantId: string,
    data: { friendId: string; richMenuId: string },
  ) {
    const [menu] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.id, data.richMenuId), eq(richMenus.tenantId, tenantId)))
      .limit(1);

    if (!menu || !menu.lineRichMenuId) throw new Error('Rich menu not found or not synced');

    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, menu.lineAccountId))
      .limit(1);

    if (!account) throw new Error('Account not found');

    // Get friend's LINE user ID
    const [friend] = await this.db
      .select()
      .from(friends)
      .where(and(eq(friends.id, data.friendId), eq(friends.tenantId, tenantId)))
      .limit(1);

    if (!friend) throw new Error('Friend not found');

    const creds = { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken };
    await this.lineService.linkRichMenuToUser(creds, friend.lineUserId, menu.lineRichMenuId);

    return { success: true };
  }
}
