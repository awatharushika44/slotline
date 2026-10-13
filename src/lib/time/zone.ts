
import { DateTime } from "luxon";

export const APP_TIME_ZONE = "Asia/Colombo";

function parseInColombo(iso: string): DateTime {
  const parsed = DateTime.fromISO(iso, { zone: APP_TIME_ZONE });

  if (!parsed.isValid) {
    throw new Error(`Invalid date/time: "${iso}"`);
  }

  return parsed;
}

/** The UTC range [start, end) that covers one calendar day in Colombo. */
export function dayRangeUtc(ymd: string): { start: Date; end: Date } {
  const start = parseInColombo(ymd).startOf("day");

  return {
    start: start.toJSDate(),
    end: start.plus({ days: 1 }).toJSDate(),
  };
}

/** Turns a Colombo wall-clock time ("2026-10-14", "09:30") into an exact instant. */
export function colomboInstant(ymd: string, hhmm: string): Date {
  return parseInColombo(`${ymd}T${hhmm}`).toJSDate();
}

/** Converts an exact instant into its calendar date in Colombo. */
export function ymdInColombo(instant: Date): string {
  return DateTime.fromJSDate(instant, {
    zone: APP_TIME_ZONE,
  }).toFormat("yyyy-MM-dd");
}

/** Returns today's calendar date in Colombo. */
export function todayInColombo(now: Date = new Date()): string {
  return ymdInColombo(now);
}

/** Checks whether a string is a valid YYYY-MM-DD calendar date. */
export function isValidYmd(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    DateTime.fromISO(value, { zone: APP_TIME_ZONE }).isValid &&
    DateTime.fromISO(value, { zone: APP_TIME_ZONE }).toFormat("yyyy-MM-dd") === value
  );
}

/** Parses a datetime-local value as Colombo wall-clock time. */
export function colomboLocalToInstant(local: string): Date {
  return parseInColombo(local).toJSDate();
}

/** Formats an exact instant as a Colombo datetime-local value. */
export function instantToColomboLocal(instant: Date): string {
  return DateTime.fromJSDate(instant, {
    zone: APP_TIME_ZONE,
  }).toFormat("yyyy-MM-dd'T'HH:mm");
}

/** Adds calendar days to a YYYY-MM-DD date in Colombo. */
export function addDaysYmd(ymd: string, days: number): string {
  return parseInColombo(ymd).plus({ days }).toFormat("yyyy-MM-dd");
}
