import {
  listActiveForRange,
  listReservationsForList,
  type ReservationListFilters,
} from "@/lib/db/reservation-repo";
import { listResources, type Resource } from "@/lib/db/resource-repo";
import { isAdmin, type Actor } from "@/lib/domain/actor";
import { getResourceStatus, type ResourceStatus } from "@/lib/domain/resource-status";
import { dayRangeUtc } from "@/lib/time/zone";

const DAY_MS = 24 * 3_600_000;

export interface BoardRow {
  resource: Resource;
  status: ResourceStatus;
}

/** Status of every active resource right now (departures board). */
export async function getBoard(now: Date): Promise<BoardRow[]> {
  const [resources, booked] = await Promise.all([
    listResources({ includeArchived: false }),
    listActiveForRange({ start: now, end: new Date(now.getTime() + DAY_MS) }),
  ]);
  return resources.map((resource) => ({
    resource,
    status: getResourceStatus(
      booked.filter((b) => b.resourceId === resource.id),
      now,
    ),
  }));
}

/** One Colombo day: active resources, plus archived ones that still hold bookings that day. */
export async function getDayView(ymd: string) {
  const range = dayRangeUtc(ymd);
  const [resources, reservations] = await Promise.all([
    listResources({ includeArchived: true }),
    listActiveForRange(range),
  ]);
  const withBookings = new Set(reservations.map((r) => r.resourceId));
  return {
    range,
    reservations,
    resources: resources.filter((r) => r.isActive || withBookings.has(r.id)),
  };
}

/** Members are always scoped to themselves (BR8), whatever the filters say. Admins can filter by person. */
export function getReservationList(actor: Actor, filters: ReservationListFilters, now: Date) {
  return listReservationsForList(
    { ...filters, userId: isAdmin(actor) ? filters.userId : actor.id },
    now,
  );
}