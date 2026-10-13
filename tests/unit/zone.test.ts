import { describe, expect, it } from "vitest";
import { addDaysYmd, colomboInstant, dayRangeUtc, todayInColombo } from "@/lib/time/zone";

describe("Colombo time helpers", () => {
  it("a Colombo day starts at 18:30 UTC the day before", () => {
    const { start, end } = dayRangeUtc("2026-10-14");
    expect(start.toISOString()).toBe("2026-10-13T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-10-14T18:30:00.000Z");
  });
  it("converts Colombo wall-clock time to a UTC instant", () => {
    expect(colomboInstant("2026-10-14", "09:30").toISOString()).toBe("2026-10-14T04:00:00.000Z");
  });
  it("knows that 20:00 UTC is already tomorrow in Colombo", () => {
    expect(todayInColombo(new Date("2026-10-14T20:00:00.000Z"))).toBe("2026-10-15");
  });
  it("adds days to a calendar date", () => {
    expect(addDaysYmd("2026-10-31", 1)).toBe("2026-11-01");
  });
});