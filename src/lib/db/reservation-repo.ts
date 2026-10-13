import { and, eq, gt, lt } from "drizzle-orm";
import type { TimeRange } from "@/lib/domain/overlap";
import { db } from "./client";
import { reservationEvents, reservations, users } from "./schema";

export type NewReservation = typeof reservations.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;

/** Active reservations on a resource that overlap the range, with the holder's name. */
export async function listActiveInRange(
  resourceId: string,
  range: TimeRange,
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
        lt(reservations.startsAt, range.end),
        gt(reservations.endsAt, range.start),
      ),
    );
}

export type ConflictingReservation = Awaited<
  ReturnType<typeof listActiveInRange>
>[number];

/** Creates the reservation and its audit event in ONE transaction (all or nothing). */
export async function insertReservationWithEvent(
  values: NewReservation,
  actorId: string,
): Promise<Reservation> {
  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .insert(reservations)
      .values(values)
      .returning();

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