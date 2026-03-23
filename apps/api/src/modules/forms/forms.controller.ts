import { Controller, Get, Post, Patch, Delete, Body, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { FormsService } from './forms.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from './dto/forms.dto';

@Controller('api/v1/forms')
@UseGuards(AuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.formsService.list(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateFormDto) {
    return this.formsService.create(tenantId, body);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.formsService.getById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateFormDto) {
    await this.formsService.update(id, body);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.formsService.delete(id);
    return { ok: true };
  }

  @Post(':id/submit')
  async submit(@Param('id') formId: string, @Body() body: SubmitFormDto) {
    return this.formsService.submitResponse(formId, body.friendId || null, body.answers);
  }

  @Get(':id/responses')
  async responses(@Param('id') formId: string) {
    return this.formsService.getResponses(formId);
  }

  @Get(':id/responses/export/csv')
  async exportResponsesCsv(@Param('id') formId: string, @Res() res: Response) {
    const form = await this.formsService.getById(formId);
    const responses = await this.formsService.getResponses(formId);

    // Collect all answer keys across responses
    const allKeys = new Set<string>();
    for (const r of responses) {
      if (r.answers && typeof r.answers === 'object') {
        for (const key of Object.keys(r.answers as Record<string, unknown>)) {
          allKeys.add(key);
        }
      }
    }
    const answerKeys = Array.from(allKeys);

    const headers = ['#', '友だちID', ...answerKeys, '回答日時'];
    const escCsv = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = responses.map((r, i) => {
      const answers = (r.answers || {}) as Record<string, unknown>;
      return [
        String(i + 1),
        escCsv(r.friendId || '匿名'),
        ...answerKeys.map((k) => escCsv(String(answers[k] ?? ''))),
        escCsv(r.submittedAt ? new Date(r.submittedAt).toLocaleString('ja-JP') : ''),
      ].join(',');
    });

    const csv = '\uFEFF' + headers.map(escCsv).join(',') + '\n' + rows.join('\n');
    const filename = `form_${form.name || formId}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
