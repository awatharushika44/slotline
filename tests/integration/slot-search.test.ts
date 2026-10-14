import "./setup-env"; // must stay first
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/lib/db/client";
import { createReservation } from "@/lib/services/reservation-service";
import { findSlots } from "@/lib/services/slot-search-service";
import { createResourceRow, createUser, migrateTestDatabase, resetDatabase } from "./helpers";

const NOW = new Date("2035-03-10T02:00:00.000Z"); // 07:30 in Colombo: before opening
const iso = (hhmmUtc: string) => `2035-03-10T${hhmmUtc}:00.000Z`;

let userId = "";
let roomA = "";

beforeAll(migrateTestDatabase);
afterAll(() => pool.end());
beforeEach(async () => {
  await resetDatabase();
  userId = (await createUser("member")).id;
  roomA = (await createResourceRow("Room A")).id;
  await createResourceRow("Room B");
  await createResourceRow("Van", { category: "vehicle" });
});

const bookA = (from: string, to: string) =>
  createReservation({ resourceId: roomA, title: "Busy", startsAt: new Date(iso(from)), endsAt: new Date(iso(to)) }, userId);

describe("findSlots", () => {
  it("filters by category and sorts by start time", async () => {
    await bookA("02:30", "03:30"); // Room A busy 08:00-09:00 Colombo
    const slots = await findSlots({ durationMinutes: 60, category: "room", now: NOW, days: 1, limit: 10 });
    expect(slots.map((s) => s.resourceName)).toEqual(["Room B", "Room A"]);
    expect(slots[0]?.start.toISOString()).toBe(iso("02:30"));
    expect(slots[1]?.start.toISOString()).toBe(iso("03:30"));
  });

  it("skips a resource that is booked all working day", async () => {
    await bookA("02:30", "12:30");
    const slots = await findSlots({ durationMinutes: 60, category: "room", now: NOW, days: 1, limit: 10 });
    expect(slots.map((s) => s.resourceName)).toEqual(["Room B"]);
  });
});