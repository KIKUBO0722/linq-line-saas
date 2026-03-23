import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
  UseInterceptors, UploadedFile, Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RichMenusService } from './rich-menus.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateRichMenuGroupDto, AssignMenuDto, CreateRichMenuDto, UpdateRichMenuDto } from './dto/rich-menus.dto';
import { Request } from 'express';

@ApiTags('RichMenus')
@Controller('api/v1/rich-menus')
@UseGuards(AuthGuard)
export class RichMenusController {
  constructor(private readonly richMenusService: RichMenusService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.richMenusService.findByTenant(tenantId);
  }

  @Get('groups')
  async listGroups(@TenantId() tenantId: string) {
    return this.richMenusService.listGroups(tenantId);
  }

  @Post('groups')
  async createGroup(@TenantId() tenantId: string, @Body() body: CreateRichMenuGroupDto) {
    return this.richMenusService.createGroup(tenantId, body);
  }

  @Delete('groups/:groupId')
  async deleteGroup(@TenantId() tenantId: string, @Param('groupId') groupId: string) {
    return this.richMenusService.deleteGroup(tenantId, groupId);
  }

  @Post('groups/:groupId/default')
  async setGroupDefault(@TenantId() tenantId: string, @Param('groupId') groupId: string) {
    return this.richMenusService.setGroupDefault(tenantId, groupId);
  }

  @Post('assign')
  async assignMenuToUser(@TenantId() tenantId: string, @Body() body: AssignMenuDto) {
    return this.richMenusService.assignMenuToUser(tenantId, body);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateRichMenuDto) {
    return this.richMenusService.create(tenantId, body);
  }

  @Patch(':id')
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdateRichMenuDto) {
    return this.richMenusService.update(tenantId, id, body);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 1024 * 1024 } }))
  async uploadImage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No image file provided');
    return this.richMenusService.uploadImage(tenantId, id, file.buffer, file.mimetype);
  }

  @Delete(':id')
  async delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.richMenusService.delete(tenantId, id);
  }

  @Post(':id/default')
  async setDefault(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.richMenusService.setDefault(tenantId, id);
  }
}
