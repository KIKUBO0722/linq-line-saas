import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { GreetingsService } from './greetings.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/greetings')
@UseGuards(AuthGuard)
export class GreetingsController {
  constructor(private readonly greetingsService: GreetingsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.greetingsService.list(req.tenantId);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      type: string;
      name: string;
      messages: any[];
      isActive?: boolean;
    },
  ) {
    return this.greetingsService.create(req.tenantId, body);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      messages?: any[];
      isActive?: boolean;
    },
  ) {
    return this.greetingsService.update(id, req.tenantId, body);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    await this.greetingsService.delete(id, req.tenantId);
    return { success: true };
  }
}
