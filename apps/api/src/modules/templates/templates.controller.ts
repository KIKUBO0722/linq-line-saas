import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/templates')
@UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async list(@Req() req: any) {
    return this.templatesService.list(req.tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: { name: string; content: string; category?: string }) {
    return this.templatesService.create(req.tenantId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; content?: string; category?: string }) {
    return this.templatesService.update(id, body);
    }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.templatesService.delete(id);
    return { ok: true };
  }
}
