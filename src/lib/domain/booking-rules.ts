import type { TimeRange } from "./overlap";

export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 8 * 60;
export const GRID_MINUTES = 15;

const MINUTE_MS = 60_000;

export type RuleCode =
  | "END_NOT_AFTER_START"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "NOT_ON_GRID"
  | "START_IN_PAST";

export interface RuleViolation {
  code: RuleCode;
  field: "startsAt" | "endsAt";
  message: string;
}

/** Pure policy checks. `now` is passed in so tests can control the clock. */
export function validateBookingWindow(range: TimeRange, now: Date): RuleViolation[] {
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  if (endMs <= startMs) {
    return [{ code: "END_NOT_AFTER_START", field: "endsAt", message: "End time must be after the start time." }];
  }

  const violations: RuleViolation[] = [];
  const minutes = (endMs - startMs) / MINUTE_MS;

  if (minutes < MIN_DURATION_MINUTES) {
    violations.push({ code: "TOO_SHORT", field: "endsAt", message: `Bookings must be at least ${MIN_DURATION_MINUTES} minutes.` });
  }
  if (minutes > MAX_DURATION_MINUTES) {
    violations.push({ code: "TOO_LONG", field: "endsAt", message: `Bookings can be at most ${MAX_DURATION_MINUTES / 60} hours.` });
  }

  const gridMs = GRID_MINUTES * MINUTE_MS;
  if (startMs % gridMs !== 0 || endMs % gridMs !== 0) {
    violations.push({ code: "NOT_ON_GRID", field: "startsAt", message: `Times must be on a ${GRID_MINUTES}-minute step (for example 09:00 or 09:15).` });
  }

  if (startMs < now.getTime()) {
    violations.push({ code: "START_IN_PAST", field: "startsAt", message: "The start time cannot be in the past." });
  }

  return violations;
}