import { formatDayLabel, formatRange } from "@/lib/time/format";
import { ymdInColombo } from "@/lib/time/zone";

interface Snapshot {
  title?: string;
  notes?: string | null;
  startsAt?: string;
  endsAt?: string;
  status?: string;
}

export interface AuditEventLike {
  eventType: "created" | "updated" | "cancelled";
  details: unknown;
}

const asSnapshot = (value: unknown): Snapshot =>
  typeof value === "object" && value !== null ? (value as Snapshot) : {};

function when(snapshot: Snapshot): string | null {
  if (!snapshot.startsAt || !snapshot.endsAt) return null;
  const start = new Date(snapshot.startsAt);
  const end = new Date(snapshot.endsAt);
  return `${formatDayLabel(ymdInColombo(start))} ${formatRange(start, end)}`;
}

/** Turns a stored before/after snapshot into short human sentences. */
export function describeEvent(event: AuditEventLike): string[] {
  const details = (typeof event.details === "object" && event.details !== null ? event.details : {}) as {
    before?: unknown;
    after?: unknown;
  };
  const before = asSnapshot(details.before);
  const after = asSnapshot(details.after);

  if (event.eventType === "created") {
    const time = when(after);
    return [after.title ? `Created “${after.title}”${time ? ` · ${time}` : ""}` : "Created"];
  }
  if (event.eventType === "cancelled") return ["Cancelled"];
  if (before.status === "cancelled" && after.status === "active") return ["Restored after cancellation"];

  const lines: string[] = [];
  if (before.title !== undefined && after.title !== undefined && before.title !== after.title) {
    lines.push(`Title: “${before.title}” → “${after.title}”`);
  }
  const was = when(before);
  const now = when(after);
  if (was && now && was !== now) lines.push(`Time: ${was} → ${now}`);
  if (before.notes !== undefined && before.notes !== after.notes) lines.push("Notes changed");
  return lines.length > 0 ? lines : ["Updated"];
}