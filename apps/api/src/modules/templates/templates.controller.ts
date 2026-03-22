import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/templates.dto';

@Controller('api/v1/templates')
@UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.templatesService.list(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateTemplateDto) {
    return this.templatesService.create(tenantId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateTemplateDto) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.templatesService.delete(id);
    return { ok: true };
  }
}
