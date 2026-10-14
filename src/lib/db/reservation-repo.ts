import { and, asc, desc, eq, gt, ilike, inArray, lt, lte, ne } from "drizzle-orm";
import type { TimeRange } from "@/lib/domain/overlap";
import { db } from "./client";
import { reservationEvents, reservations, resources, users } from "./schema";

export type NewReservation = typeof reservations.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;

const overlaps = (range: TimeRange) =>
  and(lt(reservations.startsAt, range.end), gt(reservations.endsAt, range.start));

export async function getReservationById(id: string): Promise<Reservation | undefined> {
  const [row] = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  return row;
}

/** Active reservations on a resource that overlap the range, with the holder's name. */
export async function listActiveInRange(resourceId: string, range: TimeRange, ignoreId?: string) {
  return db
    .select({
      id: reservations.id,
      title: reservations.title,
      start: reservations.startsAt,
      end: reservations.endsAt,
      holderName: users.name,
    })
    .from(reservations)
    .innerJoin(users, eq(users.id, reservations.userId))
    .where(
      and(
        eq(reservations.resourceId, resourceId),
        eq(reservations.status, "active"),
        overlaps(range),
        ignoreId ? ne(reservations.id, ignoreId) : undefined,
      ),
    )
    .orderBy(asc(reservations.startsAt));
}

export type ConflictingReservation = Awaited<ReturnType<typeof listActiveInRange>>[number];

/** Every active reservation overlapping the range, for any resource (timeline and board). */
export async function listActiveForRange(range: TimeRange) {
  return db
    .select({
      id: reservations.id,
      resourceId: reservations.resourceId,
      userId: reservations.userId,
      title: reservations.title,
      notes: reservations.notes,
      start: reservations.startsAt,
      end: reservations.endsAt,
      holderName: users.name,
    })
    .from(reservations)
    .innerJoin(users, eq(users.id, reservations.userId))
    .where(and(eq(reservations.status, "active"), overlaps(range)))
    .orderBy(asc(reservations.startsAt));
}

/** Busy ranges per resource, in one query (for suggestions and slot search). */
export async function listBusyForResources(
  resourceIds: string[],
  range: TimeRange,
  ignoreId?: string,
): Promise<Map<string, TimeRange[]>> {
  const busy = new Map<string, TimeRange[]>();
  if (resourceIds.length === 0) return busy;

  const rows = await db
    .select({
      resourceId: reservations.resourceId,
      start: reservations.startsAt,
      end: reservations.endsAt,
    })
    .from(reservations)
    .where(
      and(
        inArray(reservations.resourceId, resourceIds),
        eq(reservations.status, "active"),
        overlaps(range),
        ignoreId ? ne(reservations.id, ignoreId) : undefined,
      ),
    );

  for (const row of rows) {
    const list = busy.get(row.resourceId) ?? [];
    list.push({ start: row.start, end: row.end });
    busy.set(row.resourceId, list);
  }
  return busy;
}

export interface ReservationListFilters {
  mode: "upcoming" | "past";
  page: number;
  userId?: string;
  resourceId?: string;
  status?: "active" | "cancelled";
  search?: string;
}

export const RESERVATION_PAGE_SIZE = 20;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&"); // % and _ are wildcards in LIKE

export async function listReservationsForList(filters: ReservationListFilters, now: Date) {
  const rows = await db
    .select({
      id: reservations.id,
      userId: reservations.userId,
      title: reservations.title,
      status: reservations.status,
      start: reservations.startsAt,
      end: reservations.endsAt,
      resourceName: resources.name,
      holderName: users.name,
    })
    .from(reservations)
    .innerJoin(resources, eq(resources.id, reservations.resourceId))
    .innerJoin(users, eq(users.id, reservations.userId))
    .where(
      and(
        filters.mode === "upcoming" ? gt(reservations.endsAt, now) : lte(reservations.endsAt, now),
        filters.userId ? eq(reservations.userId, filters.userId) : undefined,
        filters.resourceId ? eq(reservations.resourceId, filters.resourceId) : undefined,
        filters.status ? eq(reservations.status, filters.status) : undefined,
        filters.search ? ilike(reservations.title, `%${escapeLike(filters.search)}%`) : undefined,
      ),
    )
    .orderBy(
      filters.mode === "upcoming" ? asc(reservations.startsAt) : desc(reservations.startsAt),
      asc(reservations.id), // tie-breaker: stable pages
    )
    .limit(RESERVATION_PAGE_SIZE + 1) // one extra row tells us whether a next page exists
    .offset((filters.page - 1) * RESERVATION_PAGE_SIZE);

  return { rows: rows.slice(0, RESERVATION_PAGE_SIZE), hasNext: rows.length > RESERVATION_PAGE_SIZE };
}

/** Creates the reservation and its audit event in ONE transaction (all or nothing). */
export async function insertReservationWithEvent(
  values: NewReservation,
  actorId: string,
): Promise<Reservation> {
  return db.transaction(async (tx) => {
    const [reservation] = await tx.insert(reservations).values(values).returning();
    if (!reservation) {
      throw new Error("Insert returned no row.");
    }
    await tx.insert(reservationEvents).values({
      reservationId: reservation.id,
      actorId,
      eventType: "created",
      details: {
        after: {
          resourceId: reservation.resourceId,
          title: reservation.title,
          startsAt: reservation.startsAt,
          endsAt: reservation.endsAt,
        },
      },
    });
    return reservation;
  });
}

const snapshot = (r: Reservation) => ({
  title: r.title,
  notes: r.notes,
  startsAt: r.startsAt,
  endsAt: r.endsAt,
  status: r.status,
});

/** Edit + audit event in one transaction. undefined = the booking is no longer active. */
export async function updateReservationWithEvent(
  id: string,
  values: Pick<NewReservation, "title" | "notes" | "startsAt" | "endsAt">,
  actorId: string,
  before: Reservation,
): Promise<Reservation | undefined> {
  return db.transaction(async (tx) => {
    const [after] = await tx
      .update(reservations)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(reservations.id, id), eq(reservations.status, "active")))
      .returning();
    if (!after) return undefined;
    await tx.insert(reservationEvents).values({
      reservationId: id,
      actorId,
      eventType: "updated",
      details: { before: snapshot(before), after: snapshot(after) },
    });
    return after;
  });
}

/** Cancel (active to cancelled) or restore (cancelled to active), with an audit event. */
export async function setStatusWithEvent(
  id: string,
  from: "active" | "cancelled",
  to: "active" | "cancelled",
  actorId: string,
): Promise<Reservation | undefined> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(reservations)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(reservations.id, id), eq(reservations.status, from)))
      .returning();
    if (!row) return undefined; // someone else changed it first
    await tx.insert(reservationEvents).values({
      reservationId: id,
      actorId,
      eventType: to === "cancelled" ? "cancelled" : "updated",
      details: { before: { status: from }, after: { status: to } },
    });
    return row;
  });
}