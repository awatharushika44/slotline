import { GRID_MINUTES } from "./booking-rules";
import type { TimeRange } from "./overlap";

export interface Placement {
  leftPct: number;
  widthPct: number;
}

/** Where `instant` sits inside `range`: 0 = start, 1 = end (can be outside 0..1). */
export function fractionOfRange(instant: Date, range: TimeRange): number {
  return (instant.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime());
}

/** Position of an item inside the day, clipped to the day. null = not visible. */
export function placeOnRange(item: TimeRange, range: TimeRange): Placement | null {
  const start = Math.max(item.start.getTime(), range.start.getTime());
  const end = Math.min(item.end.getTime(), range.end.getTime());
  if (end <= start) return null;
  const total = range.end.getTime() - range.start.getTime();
  return {
    leftPct: ((start - range.start.getTime()) / total) * 100,
    widthPct: ((end - start) / total) * 100,
  };
}

/** A click at `fraction` of the day becomes minutes since midnight, snapped DOWN to the grid. */
export function snapMinutes(fraction: number, totalMinutes: number): number {
  const raw = Math.floor((fraction * totalMinutes) / GRID_MINUTES) * GRID_MINUTES;
  return Math.min(Math.max(raw, 0), totalMinutes - GRID_MINUTES);
}