import { describeEvent } from "@/lib/audit/describe-event";
import { listEventsForReservation, listRecentEvents } from "@/lib/db/audit-repo";
import { getReservationById } from "@/lib/db/reservation-repo";
import { isAdmin, type Actor } from "@/lib/domain/actor";
import { formatDayLabel, formatTime } from "@/lib/time/format";
import { ymdInColombo } from "@/lib/time/zone";

export interface AuditItem {
  id: number;
  who: string;
  when: string;
  lines: string[];
}

export interface ActivityItem extends AuditItem {
  title: string;
  resourceName: string;
}

export type HistoryResult = { ok: true; items: AuditItem[] } | { ok: false; message: string };

const whenLabel = (date: Date) => `${formatDayLabel(ymdInColombo(date))} ${formatTime(date)}`;

/** Only the owner or an admin may read a booking's history. */
export async function getReservationHistory(id: string, actor: Actor): Promise<HistoryResult> {
  const reservation = await getReservationById(id);
  if (!reservation) return { ok: false, message: "That reservation no longer exists." };
  if (reservation.userId !== actor.id && !isAdmin(actor)) {
    return { ok: false, message: "Only the owner or an admin can see the history." };
  }
  const events = await listEventsForReservation(id);
  return {
    ok: true,
    items: events.map((e) => ({ id: e.id, who: e.actorName, when: whenLabel(e.createdAt), lines: describeEvent(e) })),
  };
}

/** Organisation-wide feed: admins only. */
export async function getRecentActivity(actor: Actor, limit = 10): Promise<ActivityItem[]> {
  if (!isAdmin(actor)) return [];
  const events = await listRecentEvents(limit);
  return events.map((e) => ({
    id: e.id,
    who: e.actorName,
    when: whenLabel(e.createdAt),
    lines: describeEvent(e),
    title: e.title,
    resourceName: e.resourceName,
  }));
}