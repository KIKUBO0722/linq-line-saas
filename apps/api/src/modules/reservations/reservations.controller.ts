import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateSlotDto, CreateReservationDto, SaveCalendarIntegrationDto, UpdateReservationStatusDto } from './dto/reservations.dto';

@Controller('api/v1/reservations')
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  @Get('slots')
  async listSlots(@TenantId() tenantId: string) {
    return this.reservationsService.listSlots(tenantId);
  }

  @Post('slots')
  async createSlot(@TenantId() tenantId: string, @Body() body: CreateSlotDto) {
    return this.reservationsService.createSlot(tenantId, body);
  }

  @Delete('slots/:id')
  async deleteSlot(@Param('id') id: string) {
    await this.reservationsService.deleteSlot(id);
    return { ok: true };
  }

  @Get()
  async listReservations(
    @TenantId() tenantId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.listReservations(tenantId, { date, status });
  }

  @Post()
  async createReservation(@Body() body: CreateReservationDto) {
    return this.reservationsService.createReservation(body);
  }

  @Get('calendar-integration')
  async getCalendarIntegration(@TenantId() tenantId: string) {
    return this.googleCalendarService.getIntegration(tenantId) || { isActive: false };
  }

  @Post('calendar-integration')
  async saveCalendarIntegration(@TenantId() tenantId: string, @Body() body: SaveCalendarIntegrationDto) {
    return this.googleCalendarService.saveIntegration(tenantId, {
      calendarId: body.calendarId,
      credentials: { serviceAccountKey: body.serviceAccountKey },
    });
  }

  @Delete('calendar-integration')
  async disableCalendarIntegration(@TenantId() tenantId: string) {
    await this.googleCalendarService.disableIntegration(tenantId);
    return { ok: true };
  }

  @Patch(':id/status')
  async updateReservationStatus(@Param('id') id: string, @Body() body: UpdateReservationStatusDto) {
    await this.reservationsService.updateReservationStatus(id, body.status);
    return { ok: true };
  }

  @Delete(':id')
  async deleteReservation(@Param('id') id: string) {
    await this.reservationsService.deleteReservation(id);
    return { ok: true };
  }
}
