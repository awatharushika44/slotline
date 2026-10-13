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
  return { start: start.toJSDate(), end: start.plus({ days: 1 }).toJSDate() };
}

/** Turns a Colombo wall-clock time ("2026-10-14", "09:30") into an exact instant. */
export function colomboInstant(ymd: string, hhmm: string): Date {
  return parseInColombo(`${ymd}T${hhmm}`).toJSDate();
}

export function todayInColombo(now: Date = new Date()): string {
  return DateTime.fromJSDate(now, { zone: APP_TIME_ZONE }).toFormat("yyyy-MM-dd");
}

export function addDaysYmd(ymd: string, days: number): string {
  return parseInColombo(ymd).plus({ days }).toFormat("yyyy-MM-dd");
}