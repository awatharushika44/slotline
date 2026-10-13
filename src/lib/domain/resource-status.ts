import type { TimeRange } from "./overlap";

export interface StatusBooking extends TimeRange {
  holderName: string;
  title: string;
}

export type ResourceStatus =
  | { state: "busy"; until: Date; holderName: string; title: string }
  | { state: "free"; until: Date | null }; // until = next booking start; null = nothing ahead in the data

/** Pure: powers the departures board. Pass ACTIVE bookings only. */
export function getResourceStatus(bookings: readonly StatusBooking[], now: Date): ResourceStatus {
  const sorted = [...bookings].sort((a, b) => a.start.getTime() - b.start.getTime());
  const nowMs = now.getTime();

  const current = sorted.find((b) => b.start.getTime() <= nowMs && nowMs < b.end.getTime());
  if (current) {
    let until = current.end;
    for (const b of sorted) {
      // follow back-to-back bookings so "busy until" is when it is REALLY free
      if (b.start.getTime() <= until.getTime() && b.end.getTime() > until.getTime()) until = b.end;
    }
    return { state: "busy", until, holderName: current.holderName, title: current.title };
  }

  const next = sorted.find((b) => b.start.getTime() > nowMs);
  return { state: "free", until: next ? next.start : null };
}