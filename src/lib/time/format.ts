import { DateTime } from "luxon";
import { APP_TIME_ZONE, ymdInColombo } from "./zone";

const inColombo = (date: Date) => DateTime.fromJSDate(date, { zone: APP_TIME_ZONE }).setLocale("en");

export const formatTime = (date: Date): string => inColombo(date).toFormat("HH:mm");

export function formatDayLabel(ymd: string): string {
  return DateTime.fromISO(ymd, { zone: APP_TIME_ZONE }).setLocale("en").toFormat("ccc d LLL");
}

/** "09:00–10:00", or "22:00–02:00 (+1)" when it ends on the next day. */
export function formatRange(start: Date, end: Date): string {
  const nextDay = ymdInColombo(end) !== ymdInColombo(start);
  return `${formatTime(start)}–${formatTime(end)}${nextDay ? " (+1)" : ""}`;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}