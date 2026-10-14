import "./setup-env"; // must stay first
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/lib/db/client";
import { reservations } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain/actor";
import { getBookedHoursPerResource, getHeatCells } from "@/lib/db/insights-repo";
import { getReservationHistory } from "@/lib/services/audit-service";
import { cancelReservation, createReservation, updateReservation } from "@/lib/services/reservation-service";
import { dayRangeUtc } from "@/lib/time/zone";
import { createResourceRow, createUser, migrateTestDatabase, resetDatabase } from "./helpers";

const DAY = "2035-03-10";
const at = (hhmmUtc: string) => new Date(`${DAY}T${hhmmUtc}:00.000Z`);
const LONG_BEFORE = new Date("2035-03-01T00:00:00.000Z");

let owner: Actor;
let other: Actor;
let admin: Actor;
let roomId = "";

beforeAll(migrateTestDatabase);
afterAll(() => pool.end());
beforeEach(async () => {
  await resetDatabase();
  owner = await createUser("member", "Owner");
  other = await createUser("member", "Other");
  admin = await createUser("admin", "Admin");
  roomId = (await createResourceRow("Room A")).id;
  await createResourceRow("Room B");
});

describe("insights SQL", () => {
  it("clips bookings to working hours and ignores cancelled ones", async () => {
    await db.insert(reservations).values([
      { resourceId: roomId, userId: owner.id, title: "Morning", startsAt: at("02:30"), endsAt: at("04:30") }, // 08:00-10:00 Colombo: 2 h
      { resourceId: roomId, userId: owner.id, title: "Evening", startsAt: at("11:30"), endsAt: at("14:30") }, // 17:00-20:00: 1 h counts
      { resourceId: roomId, userId: owner.id, title: "Dropped", startsAt: at("05:00"), endsAt: at("06:00"), status: "cancelled" },
    ]);
    const rows = await getBookedHoursPerResource(DAY, 1);
    expect(rows.find((r) => r.name === "Room A")?.bookedHours).toBeCloseTo(3);
    expect(rows.find((r) => r.name === "Room B")?.bookedHours).toBe(0);
  });

  it("buckets a 2-hour booking into 2 Colombo hours", async () => {
    await db.insert(reservations).values({ resourceId: roomId, userId: owner.id, title: "Two hours", startsAt: at("02:30"), endsAt: at("04:30") });
    const cells = await getHeatCells(dayRangeUtc(DAY));
    expect(cells).toContainEqual(expect.objectContaining({ hour: 8, bookings: 1 }));
    expect(cells).toContainEqual(expect.objectContaining({ hour: 9, bookings: 1 }));
    expect(cells.some((c) => c.hour === 10)).toBe(false); // half-open: it ends at 10:00 sharp
  });
});

describe("audit trail", () => {
  it("records create, update and cancel, in order, with who and what", async () => {
    const created = await createReservation({ resourceId: roomId, title: "Old title", startsAt: at("04:30"), endsAt: at("05:30") }, owner.id);
    if (!created.ok) throw new Error("setup failed");
    await updateReservation(created.reservation.id, { title: "New title", startsAt: at("04:30"), endsAt: at("05:30") }, owner, LONG_BEFORE);
    await cancelReservation(created.reservation.id, owner, LONG_BEFORE);

    const history = await getReservationHistory(created.reservation.id, owner);
    if (!history.ok) throw new Error("expected history");
    expect(history.items).toHaveLength(3);
    expect(history.items.every((i) => i.who === "Owner")).toBe(true);
    expect(history.items[0]?.lines[0]).toContain("Created");
    expect(history.items[1]?.lines[0]).toBe("Title: “Old title” → “New title”");
    expect(history.items[2]?.lines[0]).toBe("Cancelled");
  });

  it("hides history from other members but shows it to admins", async () => {
    const created = await createReservation({ resourceId: roomId, title: "Private", startsAt: at("04:30"), endsAt: at("05:30") }, owner.id);
    if (!created.ok) throw new Error("setup failed");
    expect((await getReservationHistory(created.reservation.id, other)).ok).toBe(false);
    expect((await getReservationHistory(created.reservation.id, admin)).ok).toBe(true);
  });
});