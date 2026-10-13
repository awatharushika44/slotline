import { describe, expect, it } from "vitest";
import { findConflicts, getFreeIntervals, rangesOverlap } from "@/lib/domain/overlap";

const t = (hhmm: string) => new Date(`2030-01-01T${hhmm}:00.000Z`);
const range = (from: string, to: string) => ({ start: t(from), end: t(to) });

describe("rangesOverlap", () => {
  it("detects partial overlap", () => {
    expect(rangesOverlap(range("10:00", "11:00"), range("10:30", "11:30"))).toBe(true);
  });
  it("detects containment", () => {
    expect(rangesOverlap(range("09:00", "12:00"), range("10:00", "11:00"))).toBe(true);
  });
  it("detects identical ranges", () => {
    expect(rangesOverlap(range("10:00", "11:00"), range("10:00", "11:00"))).toBe(true);
  });
  it("allows back-to-back bookings (half-open)", () => {
    expect(rangesOverlap(range("10:00", "11:00"), range("11:00", "12:00"))).toBe(false);
    expect(rangesOverlap(range("11:00", "12:00"), range("10:00", "11:00"))).toBe(false);
  });
  it("ignores far-apart ranges", () => {
    expect(rangesOverlap(range("08:00", "09:00"), range("13:00", "14:00"))).toBe(false);
  });
});

describe("findConflicts", () => {
  const existing = [
    { id: "a", ...range("09:00", "10:00") },
    { id: "b", ...range("10:00", "11:00") },
  ];

  it("returns only the clashing bookings", () => {
    const result = findConflicts(range("09:30", "10:00"), existing);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
  it("ignores the booking being edited (BR11)", () => {
    expect(findConflicts(range("09:00", "10:30"), existing, "a").map((r) => r.id)).toEqual(["b"]);
  });
});

describe("getFreeIntervals", () => {
  const day = range("08:00", "18:00");

  it("returns the whole window when nothing is booked", () => {
    expect(getFreeIntervals(day, [])).toEqual([day]);
  });
  it("splits around a booking in the middle", () => {
    expect(getFreeIntervals(day, [range("10:00", "11:00")])).toEqual([
      range("08:00", "10:00"),
      range("11:00", "18:00"),
    ]);
  });
  it("merges back-to-back bookings into one busy block", () => {
    expect(getFreeIntervals(day, [range("10:00", "11:00"), range("11:00", "12:00")])).toEqual([
      range("08:00", "10:00"),
      range("12:00", "18:00"),
    ]);
  });
  it("handles a booking that starts before the window", () => {
    expect(getFreeIntervals(day, [range("07:00", "09:00")])).toEqual([range("09:00", "18:00")]);
  });
  it("returns nothing when fully booked", () => {
    expect(getFreeIntervals(day, [range("07:00", "19:00")])).toEqual([]);
  });
});