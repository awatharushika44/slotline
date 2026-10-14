import "./setup-env"; // must stay first
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/lib/db/client";
import { reservations } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain/actor";
import { getReservationList } from "@/lib/services/availability-service";
import { createResourceRow, createUser, migrateTestDatabase, resetDatabase } from "./helpers";

const NOW = new Date("2035-03-01T00:00:00.000Z");
const BASE = new Date("2035-03-10T04:30:00.000Z");
const hour = (n: number) => new Date(BASE.getTime() + n * 3_600_000);

let ana: Actor;
let ben: Actor;
let admin: Actor;
let roomId = "";

beforeAll(migrateTestDatabase);
afterAll(() => pool.end());
beforeEach(async () => {
  await resetDatabase();
  ana = await createUser("member", "Ana");
  ben = await createUser("member", "Ben");
  admin = await createUser("admin", "Admin");
  roomId = (await createResourceRow("Room")).id;
});

const insert = (userId: string, title: string, index: number, status: "active" | "cancelled" = "active") =>
  db.insert(reservations).values({ resourceId: roomId, userId, title, startsAt: hour(index), endsAt: new Date(hour(index).getTime() + 1_800_000), status });

const base = { mode: "upcoming" as const, page: 1 };

describe("reservation list", () => {
  it("scopes members to their own rows, even if they ask for someone else", async () => {
    await insert(ana.id, "Ana plan", 0);
    await insert(ben.id, "Ben plan", 1);
    const { rows } = await getReservationList(ana, { ...base, userId: ben.id }, NOW);
    expect(rows.map((r) => r.title)).toEqual(["Ana plan"]);
  });

  it("lets admins filter by person", async () => {
    await insert(ana.id, "Ana plan", 0);
    await insert(ben.id, "Ben plan", 1);
    const { rows } = await getReservationList(admin, { ...base, userId: ben.id }, NOW);
    expect(rows.map((r) => r.title)).toEqual(["Ben plan"]);
  });

  it("searches titles case-insensitively and treats % as plain text", async () => {
    await insert(ana.id, "Budget REVIEW", 0);
    await insert(ana.id, "Lunch", 1);
    expect((await getReservationList(admin, { ...base, search: "review" }, NOW)).rows).toHaveLength(1);
    expect((await getReservationList(admin, { ...base, search: "%" }, NOW)).rows).toHaveLength(0);
  });

  it("filters by status", async () => {
    await insert(ana.id, "Kept", 0);
    await insert(ana.id, "Dropped", 1, "cancelled");
    const { rows } = await getReservationList(admin, { ...base, status: "cancelled" }, NOW);
    expect(rows.map((r) => r.title)).toEqual(["Dropped"]);
  });

  it("paginates: 21 rows give 20 plus a next page, then 1", async () => {
    await db.insert(reservations).values(
      Array.from({ length: 21 }, (_, i) => ({
        resourceId: roomId, userId: ana.id, title: `Row ${i}`,
        startsAt: hour(i), endsAt: new Date(hour(i).getTime() + 1_800_000),
      })),
    );
    const first = await getReservationList(admin, base, NOW);
    expect(first.rows).toHaveLength(20);
    expect(first.hasNext).toBe(true);
    const second = await getReservationList(admin, { ...base, page: 2 }, NOW);
    expect(second.rows).toHaveLength(1);
    expect(second.hasNext).toBe(false);
  });
});