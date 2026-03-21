import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/reservations')
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  @Get('slots')
  async listSlots(@Req() req: any) {
    return this.reservationsService.listSlots(req.tenantId);
  }

  @Post('slots')
  async createSlot(
    @Req() req: any,
    @Body() body: { name: string; duration: number; description?: string },
  ) {
    return this.reservationsService.createSlot(req.tenantId, body);
  }

  @Delete('slots/:id')
  async deleteSlot(@Param('id') id: string) {
    await this.reservationsService.deleteSlot(id);
    return { ok: true };
  }

  @Get()
  async listReservations(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.listReservations(req.tenantId, { date, status });
  }

  @Post()
  async createReservation(
    @Body() body: {
      slotId: string;
      friendId?: string;
      guestName?: string;
      date: string;
      startTime: string;
      note?: string;
      reminderMinutesBefore?: number;
    },
  ) {
    return this.reservationsService.createReservation(body);
  }

  @Get('calendar-integration')
  async getCalendarIntegration(@Req() req: any) {
    return this.googleCalendarService.getIntegration(req.tenantId) || { isActive: false };
  }

  @Post('calendar-integration')
  async saveCalendarIntegration(@Req() req: any, @Body() body: { calendarId: string; serviceAccountKey: string }) {
    return this.googleCalendarService.saveIntegration(req.tenantId, {
      calendarId: body.calendarId,
      credentials: { serviceAccountKey: body.serviceAccountKey },
    });
  }

  @Delete('calendar-integration')
  async disableCalendarIntegration(@Req() req: any) {
    await this.googleCalendarService.disableIntegration(req.tenantId);
    return { ok: true };
  }

  @Patch(':id/status')
  async updateReservationStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    await this.reservationsService.updateReservationStatus(id, body.status);
    return { ok: true };
  }

  @Delete(':id')
  async deleteReservation(@Param('id') id: string) {
    await this.reservationsService.deleteReservation(id);
    return { ok: true };
  }
}
