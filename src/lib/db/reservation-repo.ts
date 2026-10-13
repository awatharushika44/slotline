import { and, asc, desc, eq, gt, inArray, lt, lte, ne } from "drizzle-orm";
import type { TimeRange } from "@/lib/domain/overlap";
import { db } from "./client";
import { reservationEvents, reservations, resources, users } from "./schema";

export type NewReservation = typeof reservations.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;

const overlaps = (range: TimeRange) =>
  and(
    lt(reservations.startsAt, range.end),
    gt(reservations.endsAt, range.start),
  );

export async function getReservationById(
  id: string,
): Promise<Reservation | undefined> {
  const [row] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  return row;
}

/** Active reservations on a resource that overlap the range, with the holder's name. */
export async function listActiveInRange(
  resourceId: string,
  range: TimeRange,
  ignoreId?: string,
) {
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

export type ConflictingReservation =
  Awaited<ReturnType<typeof listActiveInRange>>[number];

/** Insert a reservation and its creation event atomically. */
export async function insertReservationWithEvent(
  values: NewReservation,
  actorId: string,
): Promise<Reservation> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(reservations)
      .values(values)
      .returning();

    if (!row) {
      throw new Error("Insert returned no row.");
    }

    await tx.insert(reservationEvents).values({
      reservationId: row.id,
      actorId,
      eventType: "created",
      details: {
        title: row.title,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      },
    });

    return row;
  });
}

/** Every active reservation overlapping the range, for any resource. */
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
    .where(
      and(
        eq(reservations.status, "active"),
        overlaps(range),
      ),
    )
    .orderBy(asc(reservations.startsAt));
}

/** Busy ranges per resource, in one query (for suggestions). */
export async function listBusyForResources(
  resourceIds: string[],
  range: TimeRange,
  ignoreId?: string,
): Promise<Map<string, TimeRange[]>> {
  const busy = new Map<string, TimeRange[]>();

  if (resourceIds.length === 0) {
    return busy;
  }

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

    list.push({
      start: row.start,
      end: row.end,
    });

    busy.set(row.resourceId, list);
  }

  return busy;
}

/** The list page: upcoming or past reservations. */
export async function listReservationsForList(options: {
  userId?: string;
  mode: "upcoming" | "past";
  now: Date;
  limit: number;
}) {
  return db
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
        options.mode === "upcoming"
          ? gt(reservations.endsAt, options.now)
          : lte(reservations.endsAt, options.now),
        options.userId
          ? eq(reservations.userId, options.userId)
          : undefined,
      ),
    )
    .orderBy(
      options.mode === "upcoming"
        ? asc(reservations.startsAt)
        : desc(reservations.startsAt),
    )
    .limit(options.limit);
}

const snapshot = (reservation: Reservation) => ({
  title: reservation.title,
  notes: reservation.notes,
  startsAt: reservation.startsAt,
  endsAt: reservation.endsAt,
  status: reservation.status,
});

/** Edit + audit event in one transaction. */
export async function updateReservationWithEvent(
  id: string,
  values: Pick<
    NewReservation,
    "title" | "notes" | "startsAt" | "endsAt"
  >,
  actorId: string,
  before: Reservation,
): Promise<Reservation | undefined> {
  return db.transaction(async (tx) => {
    const [after] = await tx
      .update(reservations)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reservations.id, id),
          eq(reservations.status, "active"),
        ),
      )
      .returning();

    if (!after) {
      return undefined;
    }

    await tx.insert(reservationEvents).values({
      reservationId: id,
      actorId,
      eventType: "updated",
      details: {
        before: snapshot(before),
        after: snapshot(after),
      },
    });

    return after;
  });
}

/** Cancel or restore a reservation and write its audit event atomically. */
export async function setStatusWithEvent(
  id: string,
  from: "active" | "cancelled",
  to: "active" | "cancelled",
  actorId: string,
): Promise<Reservation | undefined> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(reservations)
      .set({
        status: to,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reservations.id, id),
          eq(reservations.status, from),
        ),
      )
      .returning();

    if (!row) {
      return undefined;
    }

    await tx.insert(reservationEvents).values({
      reservationId: id,
      actorId,
      eventType: to === "cancelled" ? "cancelled" : "updated",
      details: {
        before: { status: from },
        after: { status: to },
      },
    });

    return row;
  });
}
