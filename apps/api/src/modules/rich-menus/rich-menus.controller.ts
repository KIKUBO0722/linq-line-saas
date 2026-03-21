import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RichMenusService } from './rich-menus.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/rich-menus')
@UseGuards(AuthGuard)
export class RichMenusController {
  constructor(private readonly richMenusService: RichMenusService) {}

  @Get()
  async list(@Req() req: any) {
    return this.richMenusService.findByTenant(req.tenantId);
  }

  @Get('groups')
  async listGroups(@Req() req: any) {
    return this.richMenusService.listGroups(req.tenantId);
  }

  @Post('groups')
  async createGroup(
    @Req() req: any,
    @Body() body: {
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
    return this.richMenusService.createGroup(req.tenantId, body);
  }

  @Delete('groups/:groupId')
  async deleteGroup(@Req() req: any, @Param('groupId') groupId: string) {
    return this.richMenusService.deleteGroup(req.tenantId, groupId);
  }

  @Post('groups/:groupId/default')
  async setGroupDefault(@Req() req: any, @Param('groupId') groupId: string) {
    return this.richMenusService.setGroupDefault(req.tenantId, groupId);
  }

  @Post('assign')
  async assignMenuToUser(
    @Req() req: any,
    @Body() body: { friendId: string; richMenuId: string },
  ) {
    return this.richMenusService.assignMenuToUser(req.tenantId, body);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() body: {
      lineAccountId: string;
      name: string;
      chatBarText?: string;
      areas?: any[];
      size?: { width: number; height: number };
    },
  ) {
    return this.richMenusService.create(req.tenantId, body);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      chatBarText?: string;
      areas?: any[];
      size?: { width: number; height: number };
    },
  ) {
    return this.richMenusService.update(req.tenantId, id, body);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 1024 * 1024 } }))
  async uploadImage(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No image file provided');
    return this.richMenusService.uploadImage(
      req.tenantId,
      id,
      file.buffer,
      file.mimetype,
    );
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.richMenusService.delete(req.tenantId, id);
  }

  @Post(':id/default')
  async setDefault(@Req() req: any, @Param('id') id: string) {
    return this.richMenusService.setDefault(req.tenantId, id);
  }
}
