import { describe, expect, it } from "vitest";
import { describeEvent } from "@/lib/audit/describe-event";
import { buildHeatGrid, intensityLevel, utilizationPercent } from "@/lib/domain/insights";

const iso = (hhmm: string) => `2030-01-01T${hhmm}:00.000Z`; // 04:00Z is 09:30 in Colombo

describe("intensityLevel", () => {
  it("maps ratios to 5 levels", () => {
    expect([0, 1, 3, 6, 8, 10].map((v) => intensityLevel(v, 10))).toEqual([0, 1, 2, 3, 4, 4]);
  });
  it("is 0 when nothing is booked anywhere", () => {
    expect(intensityLevel(0, 0)).toBe(0);
  });
});

describe("buildHeatGrid", () => {
  const grid = buildHeatGrid([
    { isoDow: 1, hour: 9, bookings: 4 },
    { isoDow: 3, hour: 14, bookings: 2 },
  ]);
  it("builds 7 rows and the visible hours, scaled by the busiest cell", () => {
    expect(grid.rows).toHaveLength(7);
    expect(grid.hours).toHaveLength(14);
    expect(grid.max).toBe(4);
  });
  it("places counts in the right cell", () => {
    expect(grid.rows[0]?.cells.find((c) => c.hour === 9)).toMatchObject({ bookings: 4, level: 4 });
    expect(grid.rows[2]?.cells.find((c) => c.hour === 14)).toMatchObject({ bookings: 2, level: 2 });
    expect(grid.rows[1]?.cells.every((c) => c.level === 0)).toBe(true);
  });
});

describe("utilizationPercent", () => {
  it("is booked hours over days x 10", () => {
    expect(utilizationPercent(30, 3)).toBe(100);
    expect(utilizationPercent(15, 3)).toBe(50);
    expect(utilizationPercent(0, 0)).toBe(0);
  });
});

describe("describeEvent", () => {
  it("describes creation with the time in Colombo", () => {
    const [line] = describeEvent({ eventType: "created", details: { after: { title: "Plan", startsAt: iso("04:00"), endsAt: iso("05:00") } } });
    expect(line).toContain("Plan");
    expect(line).toContain("09:30–10:30");
  });
  it("describes a title change", () => {
    const lines = describeEvent({ eventType: "updated", details: { before: { title: "Old" }, after: { title: "New" } } });
    expect(lines).toEqual(["Title: “Old” → “New”"]);
  });
  it("describes a time change with before and after", () => {
    const [line] = describeEvent({
      eventType: "updated",
      details: {
        before: { startsAt: iso("04:00"), endsAt: iso("05:00") },
        after: { startsAt: iso("04:30"), endsAt: iso("05:30") },
      },
    });
    expect(line).toContain("09:30–10:30");
    expect(line).toContain("10:00–11:00");
  });
  it("describes cancel and restore", () => {
    expect(describeEvent({ eventType: "cancelled", details: null })).toEqual(["Cancelled"]);
    expect(describeEvent({ eventType: "updated", details: { before: { status: "cancelled" }, after: { status: "active" } } })).toEqual([
      "Restored after cancellation",
    ]);
  });
});