import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc, isNull, isNotNull } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { reservationSlots, reservations, friends, lineAccounts } from '@line-saas/db';
import { LineService } from '../line/line.service';
import { GoogleCalendarService } from './google-calendar.service';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly lineService: LineService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async listSlots(tenantId: string) {
    return this.db
      .select()
      .from(reservationSlots)
      .where(eq(reservationSlots.tenantId, tenantId))
      .orderBy(reservationSlots.name);
  }

  async createSlot(tenantId: string, data: { name: string; duration: number; description?: string }) {
    const [slot] = await this.db
      .insert(reservationSlots)
      .values({ tenantId, ...data })
      .returning();
    return slot;
  }

  async deleteSlot(id: string) {
    await this.db.delete(reservations).where(eq(reservations.slotId, id));
    await this.db.delete(reservationSlots).where(eq(reservationSlots.id, id));
  }

  async listReservations(tenantId: string, query?: { date?: string; status?: string }) {
    const slots = await this.db
      .select()
      .from(reservationSlots)
      .where(eq(reservationSlots.tenantId, tenantId));

    const slotIds = slots.map((s) => s.id);
    if (slotIds.length === 0) return [];

    const conditions: ReturnType<typeof eq>[] = [];

    // We need to filter reservations by tenant's slots
    // Build conditions based on query params
    if (query?.date) {
      conditions.push(eq(reservations.date, query.date));
    }
    if (query?.status) {
      conditions.push(eq(reservations.status, query.status));
    }

    const rows = await this.db
      .select({
        id: reservations.id,
        slotId: reservations.slotId,
        friendId: reservations.friendId,
        guestName: reservations.guestName,
        date: reservations.date,
        startTime: reservations.startTime,
        status: reservations.status,
        note: reservations.note,
        createdAt: reservations.createdAt,
        slotName: reservationSlots.name,
        slotDuration: reservationSlots.duration,
      })
      .from(reservations)
      .innerJoin(reservationSlots, eq(reservations.slotId, reservationSlots.id))
      .where(
        conditions.length > 0
          ? and(eq(reservationSlots.tenantId, tenantId), ...conditions)
          : eq(reservationSlots.tenantId, tenantId),
      )
      .orderBy(desc(reservations.date), reservations.startTime);

    return rows;
  }

  async createReservation(data: {
    slotId: string;
    friendId?: string;
    guestName?: string;
    date: string;
    startTime: string;
    note?: string;
    reminderMinutesBefore?: number;
  }) {
    const [reservation] = await this.db
      .insert(reservations)
      .values(data)
      .returning();

    // Sync to Google Calendar
    try {
      const [slot] = await this.db.select().from(reservationSlots).where(eq(reservationSlots.id, data.slotId)).limit(1);
      if (slot) {
        await this.googleCalendarService.syncReservationToCalendar(
          slot.tenantId,
          reservation,
          slot.name,
          slot.duration,
        );
      }
    } catch (err) {
      this.logger.warn(`Calendar sync failed: ${err}`);
    }

    return reservation;
  }

  async updateReservationStatus(id: string, status: string) {
    await this.db
      .update(reservations)
      .set({ status })
      .where(eq(reservations.id, id));
  }

  async deleteReservation(id: string) {
    const [reservation] = await this.db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    if (reservation?.googleCalendarEventId) {
      const [slot] = await this.db.select().from(reservationSlots).where(eq(reservationSlots.id, reservation.slotId)).limit(1);
      if (slot) {
        await this.googleCalendarService.deleteCalendarEvent(slot.tenantId, reservation.googleCalendarEventId);
      }
    }
    await this.db.delete(reservations).where(eq(reservations.id, id));
  }

  async processDueReminders(): Promise<{ processed: number }> {
    const now = new Date();

    // Find reservations that:
    // - have reminderMinutesBefore set
    // - haven't sent reminder yet (reminderSentAt is null)
    // - status is 'confirmed'
    // - reminder time has passed (date+startTime - reminderMinutes <= now)
    const dueReservations = await this.db
      .select({
        reservation: reservations,
        slotName: reservationSlots.name,
        slotDuration: reservationSlots.duration,
        friendLineUserId: friends.lineUserId,
        friendDisplayName: friends.displayName,
        tenantId: reservationSlots.tenantId,
      })
      .from(reservations)
      .innerJoin(reservationSlots, eq(reservations.slotId, reservationSlots.id))
      .leftJoin(friends, eq(reservations.friendId, friends.id))
      .where(
        and(
          isNotNull(reservations.reminderMinutesBefore),
          isNull(reservations.reminderSentAt),
          eq(reservations.status, 'confirmed'),
        ),
      );

    let processed = 0;
    for (const row of dueReservations) {
      try {
        // Calculate reminder time: reservation datetime - reminderMinutes
        const reservationDateTime = new Date(`${row.reservation.date}T${row.reservation.startTime}:00`);
        const reminderTime = new Date(reservationDateTime.getTime() - (row.reservation.reminderMinutesBefore! * 60 * 1000));

        if (now < reminderTime) continue; // Not yet time

        // Skip if no friend linked or no LINE user ID
        if (!row.friendLineUserId || !row.reservation.friendId) continue;

        // Get LINE account credentials for this tenant
        const [account] = await this.db
          .select()
          .from(lineAccounts)
          .where(and(eq(lineAccounts.tenantId, row.tenantId), eq(lineAccounts.isActive, true)))
          .limit(1);

        if (!account) continue;

        const credentials = { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken };
        const timeStr = row.reservation.startTime;
        const dateStr = row.reservation.date;
        const name = row.friendDisplayName || row.reservation.guestName || 'お客様';

        const reminderText = `【予約リマインダー】\n${name}様\n\n${dateStr} ${timeStr}に「${row.slotName}」のご予約がございます。\nお忘れなくお越しくださいませ。`;

        await this.lineService.pushMessage(credentials, row.friendLineUserId, [
          { type: 'text', text: reminderText },
        ]);

        // Mark reminder as sent
        await this.db
          .update(reservations)
          .set({ reminderSentAt: new Date() })
          .where(eq(reservations.id, row.reservation.id));

        processed++;
        this.logger.log(`Sent reminder for reservation ${row.reservation.id}`);
      } catch (err) {
        this.logger.error(`Failed to send reminder for reservation ${row.reservation.id}: ${err}`);
      }
    }

    return { processed };
  }
}
