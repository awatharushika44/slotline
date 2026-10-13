
import { GRID_MINUTES } from "./booking-rules";
import { getFreeIntervals, type TimeRange } from "./overlap";

const MINUTE_MS = 60_000;

export interface ResourceBusy {
  resourceId: string;
  busy: readonly TimeRange[];
}

export interface Slot extends TimeRange {
  resourceId: string;
}

export interface FindNextSlotsInput {
  resources: readonly ResourceBusy[];
  durationMinutes: number;
  from: Date;
  until: Date;
  limit?: number;
}

/**
 * Rounds an instant UP to the next 15-minute grid line.
 */
function ceilToGrid(date: Date): Date {
  const gridMs = GRID_MINUTES * MINUTE_MS;

  return new Date(
    Math.ceil(date.getTime() / gridMs) * gridMs,
  );
}

/**
 * Finds the earliest available slots across resources.
 *
 * Results are sorted by start time, then resource ID.
 * This function is pure: it does not access the database or clock.
 */
export function findNextSlots({
  resources,
  durationMinutes,
  from,
  until,
  limit = 3,
}: FindNextSlotsInput): Slot[] {
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes % GRID_MINUTES !== 0
  ) {
    throw new RangeError(
      `durationMinutes must be a positive multiple of ${GRID_MINUTES}.`,
    );
  }

  if (
    !Number.isInteger(limit) ||
    limit < 0
  ) {
    throw new RangeError("limit must be a non-negative integer.");
  }

  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(until.getTime()) ||
    from.getTime() >= until.getTime()
  ) {
    return [];
  }

  const durationMs = durationMinutes * MINUTE_MS;
  const slots: Slot[] = [];

  for (const { resourceId, busy } of resources) {
    const freeIntervals = getFreeIntervals(
      { start: from, end: until },
      busy,
    );

    for (const gap of freeIntervals) {
      const start = ceilToGrid(gap.start);
      const end = new Date(start.getTime() + durationMs);

      if (end.getTime() <= gap.end.getTime()) {
        slots.push({
          resourceId,
          start,
          end,
        });
      }
    }
  }

  return slots
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        a.resourceId.localeCompare(b.resourceId),
    )
    .slice(0, limit);
}

