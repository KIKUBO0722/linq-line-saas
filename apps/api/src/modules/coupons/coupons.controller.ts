import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/coupons')
@UseGuards(AuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.couponsService.list(req.tenantId);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      code: string;
      discountType: string;
      discountValue: number;
      description?: string;
      expiresAt?: string;
      maxUses?: number;
    },
  ) {
    return this.couponsService.create(req.tenantId, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      code?: string;
      discountType?: string;
      discountValue?: number;
      description?: string;
      expiresAt?: string | null;
      maxUses?: number | null;
    },
  ) {
    return this.couponsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.couponsService.delete(id);
    return { ok: true };
  }

  @Post(':id/toggle')
  async toggle(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.couponsService.toggle(id, body.isActive);
  }
}
