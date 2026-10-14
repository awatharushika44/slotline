import { asc, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { reservationEvents, reservations, resources, users } from "./schema";

const eventColumns = {
  id: reservationEvents.id,
  eventType: reservationEvents.eventType,
  details: reservationEvents.details,
  createdAt: reservationEvents.createdAt,
  actorName: users.name,
};

export async function listEventsForReservation(reservationId: string) {
  return db
    .select(eventColumns)
    .from(reservationEvents)
    .innerJoin(users, eq(users.id, reservationEvents.actorId))
    .where(eq(reservationEvents.reservationId, reservationId))
    .orderBy(asc(reservationEvents.createdAt), asc(reservationEvents.id));
}

export async function listRecentEvents(limit: number) {
  return db
    .select({ ...eventColumns, title: reservations.title, resourceName: resources.name })
    .from(reservationEvents)
    .innerJoin(users, eq(users.id, reservationEvents.actorId))
    .innerJoin(reservations, eq(reservations.id, reservationEvents.reservationId))
    .innerJoin(resources, eq(resources.id, reservations.resourceId))
    .orderBy(desc(reservationEvents.createdAt), desc(reservationEvents.id))
    .limit(limit);
}