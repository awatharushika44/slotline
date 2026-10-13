import { describe, expect, it } from "vitest";
import { validateBookingWindow } from "@/lib/domain/booking-rules";
import { getReservationPermissions } from "@/lib/domain/reservation-policy";
import { getResourceStatus } from "@/lib/domain/resource-status";
import { fractionOfRange, placeOnRange, snapMinutes } from "@/lib/domain/timeline-layout";
import { formatDuration, formatRange } from "@/lib/time/format";
import { addMinutesToLocal } from "@/lib/time/local";
import { initialsOf } from "@/lib/text";

const t = (hhmm: string) => new Date(`2030-01-01T${hhmm}:00.000Z`);
const range = (a: string, b: string) => ({ start: t(a), end: t(b) });
const owner = { id: "u1", role: "member" as const };
const other = { id: "u2", role: "member" as const };
const admin = { id: "u3", role: "admin" as const };
const subject = { ownerId: "u1", status: "active" as const, range: range("10:00", "11:00") };

describe("BR12: validateBookingWindow keeps an ongoing start", () => {
  const now = t("10:30");
  const ongoing = range("10:00", "12:00");
  it("rejects a past start normally", () => {
    expect(validateBookingWindow(ongoing, now).map((v) => v.code)).toContain("START_IN_PAST");
  });
  it("accepts it when the start is unchanged", () => {
    expect(validateBookingWindow(ongoing, now, { existingStart: ongoing.start })).toEqual([]);
  });
});

describe("getReservationPermissions", () => {
  it("upcoming: the owner can edit and cancel", () => {
    expect(getReservationPermissions(subject, owner, t("09:00"))).toMatchObject({
      canEdit: true,
      canCancel: true,
      startLocked: false,
    });
  });
  it("ongoing: start is locked", () => {
    expect(getReservationPermissions(subject, owner, t("10:30"))).toMatchObject({
      canEdit: true,
      startLocked: true,
    });
  });
  it("ended: read-only", () => {
    expect(getReservationPermissions(subject, owner, t("11:00"))).toMatchObject({
      canEdit: false,
      canCancel: false,
    });
  });
  it("another member gets nothing, an admin gets everything", () => {
    expect(getReservationPermissions(subject, other, t("09:00"))).toMatchObject({
      canEdit: false,
      canCancel: false,
    });
    expect(getReservationPermissions(subject, admin, t("09:00"))).toMatchObject({
      canEdit: true,
      canCancel: true,
    });
  });
  it("cancelled upcoming: can only be restored", () => {
    expect(
      getReservationPermissions({ ...subject, status: "cancelled" }, owner, t("09:00")),
    ).toMatchObject({
      canEdit: false,
      canCancel: false,
      canRestore: true,
    });
  });
});

describe("getResourceStatus", () => {
  const booking = (a: string, b: string, holderName = "Anna") => ({
    ...range(a, b),
    holderName,
    title: "x",
  });
  it("is free with no bookings", () => {
    expect(getResourceStatus([], t("10:00"))).toEqual({ state: "free", until: null });
  });
  it("is free until the next booking starts", () => {
    expect(getResourceStatus([booking("12:00", "13:00")], t("10:00"))).toEqual({
      state: "free",
      until: t("12:00"),
    });
  });
  it("is busy during a booking, free exactly at its end (half-open)", () => {
    expect(getResourceStatus([booking("10:00", "11:00")], t("10:00")).state).toBe("busy");
    expect(getResourceStatus([booking("10:00", "11:00")], t("11:00")).state).toBe("free");
  });
  it("follows back-to-back bookings to the real free time", () => {
    const status = getResourceStatus(
      [booking("10:00", "11:00"), booking("11:00", "12:30", "Ben")],
      t("10:15"),
    );
    expect(status).toMatchObject({ state: "busy", until: t("12:30"), holderName: "Anna" });
  });
});

describe("timeline layout", () => {
  const day = {
    start: new Date("2030-01-01T00:00:00.000Z"),
    end: new Date("2030-01-02T00:00:00.000Z"),
  };

  it("places 09:00-10:00 at 37.5% of the day", () => {
    const placed = placeOnRange(range("09:00", "10:00"), day);
    expect(placed).not.toBeNull();
    if (placed) {
      expect(placed.leftPct).toBeCloseTo(37.5);
      expect(placed.widthPct).toBeCloseTo(100 / 24);
    }
  });

  it("clips an overnight booking to the day and hides outside ones", () => {
    const placed = placeOnRange(
      { start: t("22:00"), end: new Date("2030-01-02T02:00:00.000Z") },
      day,
    );
    expect(placed).not.toBeNull();
    if (placed) {
      expect(placed.leftPct + placed.widthPct).toBeCloseTo(100);
    }
    expect(
      placeOnRange(
        {
          start: new Date("2029-12-30T00:00:00.000Z"),
          end: new Date("2029-12-31T00:00:00.000Z"),
        },
        day,
      ),
    ).toBeNull();
  });

  it("snaps a click down to the 15-minute grid and clamps", () => {
    expect(snapMinutes(610 / 1440, 1440)).toBe(600);
    expect(snapMinutes(1.2, 1440)).toBe(1425);
    expect(snapMinutes(-0.1, 1440)).toBe(0);
  });

  it("reports where 'now' is inside the day", () => {
    expect(fractionOfRange(t("12:00"), day)).toBeCloseTo(0.5);
  });
});

describe("formatting helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(135 * 60_000)).toBe("2h 15m");
    expect(formatDuration(45 * 60_000)).toBe("45m");
    expect(formatDuration(120 * 60_000)).toBe("2h");
  });
  it("shows Colombo times and marks next-day ends", () => {
    expect(formatRange(t("04:00"), t("05:30"))).toBe("09:30–11:00");
    expect(formatRange(t("16:30"), new Date("2030-01-01T20:30:00.000Z"))).toBe("22:00–02:00 (+1)");
  });
  it("adds minutes to a local timestamp across midnight", () => {
    expect(addMinutesToLocal("2030-01-01T23:30", 60)).toBe("2030-01-02T00:30");
  });
  it("makes initials", () => {
    expect(initialsOf("Amaya Fernando")).toBe("AF");
    expect(initialsOf("  kasun ")).toBe("K");
  });
});