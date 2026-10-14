import { WORKDAY_HOURS } from "./working-hours";

export interface HeatCell {
  isoDow: number; // 1 = Monday ... 7 = Sunday
  hour: number; // 0-23, Colombo time
  bookings: number;
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatGrid {
  hours: number[];
  rows: { isoDow: number; label: string; cells: { hour: number; bookings: number; level: HeatLevel }[] }[];
  max: number;
}

export const HEAT_FIRST_HOUR = 7;
export const HEAT_LAST_HOUR = 20;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function intensityLevel(value: number, max: number): HeatLevel {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export function buildHeatGrid(
  cells: readonly HeatCell[],
  firstHour: number = HEAT_FIRST_HOUR,
  lastHour: number = HEAT_LAST_HOUR,
): HeatGrid {
  const counts = new Map<string, number>();
  for (const cell of cells) counts.set(`${cell.isoDow}-${cell.hour}`, cell.bookings);

  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);
  let max = 0;
  for (const hour of hours) for (let dow = 1; dow <= 7; dow++) max = Math.max(max, counts.get(`${dow}-${hour}`) ?? 0);

  const rows = DAY_LABELS.map((label, index) => ({
    isoDow: index + 1,
    label,
    cells: hours.map((hour) => {
      const bookings = counts.get(`${index + 1}-${hour}`) ?? 0;
      return { hour, bookings, level: intensityLevel(bookings, max) };
    }),
  }));
  return { hours, rows, max };
}

/** Booked working hours as a percentage of (days x 10 working hours). */
export function utilizationPercent(bookedHours: number, days: number): number {
  const available = days * WORKDAY_HOURS;
  return available <= 0 ? 0 : Math.round((bookedHours / available) * 100);
}