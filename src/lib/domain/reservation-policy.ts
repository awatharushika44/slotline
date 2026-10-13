import { isAdmin, type Actor } from "./actor";
import type { TimeRange } from "./overlap";

export type ReservationPhase = "upcoming" | "ongoing" | "ended";

export interface ReservationPermissions {
  canEdit: boolean;
  canCancel: boolean;
  canRestore: boolean;
  startLocked: boolean;
  reason?: string;
}

export function getPhase(range: TimeRange, now: Date): ReservationPhase {
  if (range.end.getTime() <= now.getTime()) return "ended";
  if (range.start.getTime() <= now.getTime()) return "ongoing";
  return "upcoming";
}

interface Subject {
  ownerId: string;
  status: "active" | "cancelled";
  range: TimeRange;
}

/** BR8 + BR12 in one pure function. The UI and the service BOTH call it. */
export function getReservationPermissions(subject: Subject, actor: Actor, now: Date): ReservationPermissions {
  const none = (reason: string): ReservationPermissions => ({
    canEdit: false, canCancel: false, canRestore: false, startLocked: false, reason,
  });

  if (subject.ownerId !== actor.id && !isAdmin(actor)) return none("You can only change your own reservations.");
  const phase = getPhase(subject.range, now);
  if (phase === "ended") return none("This reservation has already ended.");
  if (subject.status === "cancelled") {
    return { canEdit: false, canCancel: false, canRestore: true, startLocked: false, reason: "This reservation is cancelled." };
  }
  return { canEdit: true, canCancel: true, canRestore: false, startLocked: phase === "ongoing" };
}