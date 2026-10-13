export interface TimeRange {
  start: Date;
  end: Date;
}

export interface BookedRange extends TimeRange {
  id: string;
}

/** Half-open ranges [start, end): back-to-back bookings do NOT overlap. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** Bookings that clash with the candidate. Pass only ACTIVE bookings. */
export function findConflicts<T extends BookedRange>(
  candidate: TimeRange,
  existing: readonly T[],
  ignoreId?: string,
): T[] {
  return existing.filter((b) => b.id !== ignoreId && rangesOverlap(candidate, b));
}

/** The free gaps inside `window`, given the busy ranges. */
export function getFreeIntervals(window: TimeRange, busy: readonly TimeRange[]): TimeRange[] {
  const relevant = busy
    .filter((b) => rangesOverlap(window, b))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const free: TimeRange[] = [];
  let cursor = window.start;

  for (const b of relevant) {
    if (b.start.getTime() > cursor.getTime()) {
      free.push({ start: cursor, end: b.start });
    }
    if (b.end.getTime() > cursor.getTime()) {
      cursor = b.end;
    }
  }
  if (cursor.getTime() < window.end.getTime()) {
    free.push({ start: cursor, end: window.end });
  }
  return free;
}