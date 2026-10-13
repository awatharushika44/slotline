
import { describe, expect, it } from "vitest";
import {
  findNextSlots,
  type Slot,
} from "@/lib/domain/find-slots";

const t = (hhmm: string) =>
  new Date(`2030-01-01T${hhmm}:00.000Z`);

const r = (from: string, to: string) => ({
  start: t(from),
  end: t(to),
});

const view = (slots: Slot[]) =>
  slots.map(
    (s) =>
      `${s.resourceId} ${s.start.toISOString().slice(11, 16)}-${s.end.toISOString().slice(11, 16)}`,
  );

const base = {
  durationMinutes: 60,
  from: t("09:00"),
  until: t("18:00"),
};

describe("findNextSlots", () => {
  it("finds the earliest slot per resource, sorted by time", () => {
    const result = findNextSlots({
      ...base,
      resources: [
        {
          resourceId: "A",
          busy: [r("09:00", "10:00")],
        },
        {
          resourceId: "B",
          busy: [r("09:30", "12:00")],
        },
      ],
    });

    expect(view(result)).toEqual([
      "A 10:00-11:00",
      "B 12:00-13:00",
    ]);
  });

  it("rounds a gap start up to the 15-minute grid", () => {
    const result = findNextSlots({
      ...base,
      resources: [
        {
          resourceId: "A",
          busy: [r("09:00", "10:07")],
        },
      ],
    });

    expect(view(result)).toEqual([
      "A 10:15-11:15",
    ]);
  });

  it("rounds the search start up to the grid too", () => {
    const result = findNextSlots({
      ...base,
      from: t("10:07"),
      resources: [
        {
          resourceId: "A",
          busy: [],
        },
      ],
    });

    expect(view(result)).toEqual([
      "A 10:15-11:15",
    ]);
  });

  it("skips gaps that are too small", () => {
    const result = findNextSlots({
      ...base,
      resources: [
        {
          resourceId: "A",
          busy: [
            r("09:00", "10:00"),
            r("10:30", "12:00"),
          ],
        },
      ],
    });

    expect(view(result)).toEqual([
      "A 12:00-13:00",
    ]);
  });

  it("respects the result limit", () => {
    const result = findNextSlots({
      ...base,
      limit: 2,
      resources: ["A", "B", "C"].map(
        (resourceId) => ({
          resourceId,
          busy: [],
        }),
      ),
    });

    expect(view(result)).toEqual([
      "A 09:00-10:00",
      "B 09:00-10:00",
    ]);
  });

  it("returns nothing when the search window is too short", () => {
    const result = findNextSlots({
      ...base,
      until: t("09:30"),
      resources: [
        {
          resourceId: "A",
          busy: [],
        },
      ],
    });

    expect(result).toEqual([]);
  });

  it("rejects a duration that is not on the grid", () => {
    expect(() =>
      findNextSlots({
        ...base,
        durationMinutes: 20,
        resources: [],
      }),
    ).toThrow(RangeError);
  });

  it("rejects fractional durations", () => {
    expect(() =>
      findNextSlots({
        ...base,
        durationMinutes: 15.5,
        resources: [],
      }),
    ).toThrow(RangeError);
  });

  it("returns no slots when the search window is invalid", () => {
    const result = findNextSlots({
      ...base,
      from: t("12:00"),
      until: t("12:00"),
      resources: [
        {
          resourceId: "A",
          busy: [],
        },
      ],
    });

    expect(result).toEqual([]);
  });

  it("returns no slots when the limit is zero", () => {
    const result = findNextSlots({
      ...base,
      limit: 0,
      resources: [
        {
          resourceId: "A",
          busy: [],
        },
      ],
    });

    expect(result).toEqual([]);
  });
});
