
import { describe, expect, it } from "vitest";
import { validateBookingWindow } from "@/lib/domain/booking-rules";

const now = new Date("2030-01-01T00:00:00.000Z");

const t = (hhmm: string) =>
  new Date(`2030-01-01T${hhmm}:00.000Z`);

const codes = (from: string, to: string) =>
  validateBookingWindow(
    { start: t(from), end: t(to) },
    now,
  ).map((v) => v.code);

describe("validateBookingWindow", () => {
  it("accepts a normal booking", () => {
    expect(codes("10:00", "11:00")).toEqual([]);
  });

  it("accepts exactly 15 minutes and exactly 8 hours", () => {
    expect(codes("10:00", "10:15")).toEqual([]);
    expect(codes("10:00", "18:00")).toEqual([]);
  });

  it("rejects end before or equal to start", () => {
    expect(codes("11:00", "10:00")).toEqual([
      "END_NOT_AFTER_START",
    ]);

    expect(codes("10:00", "10:00")).toEqual([
      "END_NOT_AFTER_START",
    ]);
  });

  it("rejects bookings longer than 8 hours", () => {
    expect(codes("10:00", "18:15")).toContain("TOO_LONG");
    expect(codes("10:00", "18:00")).not.toContain("TOO_LONG");
  });

  it("rejects very short bookings because they are off-grid", () => {
    expect(codes("10:00", "10:07")).toContain("NOT_ON_GRID");
  });

  it("rejects times off the 15-minute grid", () => {
    expect(codes("10:07", "11:00")).toContain("NOT_ON_GRID");
  });

  it("rejects a start in the past but allows starting exactly now", () => {
    const early = validateBookingWindow(
      {
        start: new Date("2029-12-31T23:45:00.000Z"),
        end: t("01:00"),
      },
      now,
    );

    expect(early.map((v) => v.code)).toContain("START_IN_PAST");

    expect(
      validateBookingWindow(
        { start: now, end: t("01:00") },
        now,
      ),
    ).toEqual([]);
  });
});

