import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { calendarIntegrations, reservations } from '@line-saas/db';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getIntegration(tenantId: string) {
    const [integration] = await this.db
      .select()
      .from(calendarIntegrations)
      .where(eq(calendarIntegrations.tenantId, tenantId))
      .limit(1);
    return integration;
  }

  async saveIntegration(tenantId: string, data: { calendarId: string; credentials: any }) {
    const existing = await this.getIntegration(tenantId);
    if (existing) {
      await this.db
        .update(calendarIntegrations)
        .set({ calendarId: data.calendarId, credentials: data.credentials, isActive: true })
        .where(eq(calendarIntegrations.id, existing.id));
      return { ...existing, ...data, isActive: true };
    }
    const [integration] = await this.db
      .insert(calendarIntegrations)
      .values({ tenantId, calendarId: data.calendarId, credentials: data.credentials, isActive: true })
      .returning();
    return integration;
  }

  async disableIntegration(tenantId: string) {
    await this.db
      .update(calendarIntegrations)
      .set({ isActive: false })
      .where(eq(calendarIntegrations.tenantId, tenantId));
  }

  async syncReservationToCalendar(
    tenantId: string,
    reservation: { id: string; date: string; startTime: string; guestName?: string | null; note?: string | null },
    slotName: string,
    slotDuration: number,
  ): Promise<string | null> {
    try {
      const integration = await this.getIntegration(tenantId);
      if (!integration?.isActive || !integration.calendarId) return null;

      const creds = integration.credentials as any;
      if (!creds?.apiKey && !creds?.serviceAccountKey) return null;

      // Use Google Calendar API
      const { google } = await import('googleapis');

      let auth: any;
      if (creds.serviceAccountKey) {
        const key = typeof creds.serviceAccountKey === 'string'
          ? JSON.parse(creds.serviceAccountKey)
          : creds.serviceAccountKey;
        auth = new google.auth.GoogleAuth({
          credentials: key,
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });
      } else {
        // API key (read-only, won't work for insert - but handle gracefully)
        this.logger.warn('API key auth does not support calendar writes. Use a service account.');
        return null;
      }

      const calendar = google.calendar({ version: 'v3', auth });

      const startDateTime = new Date(`${reservation.date}T${reservation.startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + slotDuration * 60 * 1000);

      const event = {
        summary: `${slotName} - ${reservation.guestName || 'ゲスト'}`,
        description: reservation.note || '',
        start: { dateTime: startDateTime.toISOString(), timeZone: 'Asia/Tokyo' },
        end: { dateTime: endDateTime.toISOString(), timeZone: 'Asia/Tokyo' },
      };

      const result = await calendar.events.insert({
        calendarId: integration.calendarId,
        requestBody: event,
      });

      const eventId = result.data.id || null;

      if (eventId) {
        await this.db
          .update(reservations)
          .set({ googleCalendarEventId: eventId })
          .where(eq(reservations.id, reservation.id));
      }

      this.logger.log(`Synced reservation ${reservation.id} to Google Calendar: ${eventId}`);
      return eventId;
    } catch (err) {
      this.logger.error(`Failed to sync reservation to Google Calendar: ${err}`);
      return null;
    }
  }

  async deleteCalendarEvent(tenantId: string, googleCalendarEventId: string) {
    try {
      const integration = await this.getIntegration(tenantId);
      if (!integration?.isActive || !integration.calendarId) return;

      const creds = integration.credentials as any;
      if (!creds?.serviceAccountKey) return;

      const { google } = await import('googleapis');
      const key = typeof creds.serviceAccountKey === 'string'
        ? JSON.parse(creds.serviceAccountKey)
        : creds.serviceAccountKey;
      const auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.delete({
        calendarId: integration.calendarId,
        eventId: googleCalendarEventId,
      });

      this.logger.log(`Deleted calendar event ${googleCalendarEventId}`);
    } catch (err) {
      this.logger.error(`Failed to delete calendar event: ${err}`);
    }
  }
}
