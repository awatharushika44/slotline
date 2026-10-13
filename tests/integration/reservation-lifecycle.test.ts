import "./setup-env"; // must stay first
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/lib/db/client";
import { reservationEvents, reservations } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain/actor";
import {
  cancelReservation,
  createReservation,
  restoreReservation,
  updateReservation,
} from "@/lib/services/reservation-service";
import { createResourceRow, createUser, migrateTestDatabase, resetDatabase } from "./helpers";

const BASE = new Date("2035-03-10T04:30:00.000Z"); // on the 15-minute grid, far future
const at = (minutes: number) => new Date(BASE.getTime() + minutes * 60_000);
const LONG_BEFORE = at(-60 * 24); // "now" a day earlier: everything is upcoming

let owner: Actor;
let other: Actor;
let admin: Actor;
let roomA = "";
let roomB = "";

beforeAll(migrateTestDatabase);
afterAll(() => pool.end());
beforeEach(async () => {
  await resetDatabase();
  owner = await createUser("member", "Owner");
  other = await createUser("member", "Other");
  admin = await createUser("admin", "Admin");
  roomA = (await createResourceRow("Room A")).id;
  roomB = (await createResourceRow("Room B")).id;
});

async function book(title: string, startMin: number, lengthMin: number, who: Actor = owner) {
  const result = await createReservation(
    { resourceId: roomA, title, startsAt: at(startMin), endsAt: at(startMin + lengthMin) },
    who.id,
  );
  if (!result.ok) throw new Error(`setup booking failed: ${result.error.code}`);
  return result.reservation;
}
const edit = (startMin: number, lengthMin: number, title = "Edited") => ({
  title,
  startsAt: at(startMin),
  endsAt: at(startMin + lengthMin),
});

describe("editing", () => {
  it("lets the owner move a booking and writes an audit event", async () => {
    const r = await book("Original", 0, 60);
    expect((await updateReservation(r.id, edit(120, 60), owner, LONG_BEFORE)).ok).toBe(true);
    const events = await db.select().from(reservationEvents);
    expect(events.map((e) => e.eventType).sort()).toEqual(["created", "updated"]);
  });

  it("does not conflict with itself when extended (BR11)", async () => {
    const r = await book("Mine", 0, 60);
    expect((await updateReservation(r.id, edit(0, 90), owner, LONG_BEFORE)).ok).toBe(true);
  });

  it("reports a conflict that lists the other booking but not itself", async () => {
    const mine = await book("Mine", 0, 60);
    await book("Theirs", 120, 60, other);
    const result = await updateReservation(mine.id, edit(30, 120), owner, LONG_BEFORE); // overlaps own old slot AND Theirs
    if (result.ok || result.error.code !== "CONFLICT") throw new Error("expected CONFLICT");
    expect(result.error.conflicts.map((c) => c.title)).toEqual(["Theirs"]);
  });

  it("forbids another member but allows an admin (BR8)", async () => {
    const r = await book("Owned", 0, 60);
    expect(await updateReservation(r.id, edit(0, 60), other, LONG_BEFORE)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect((await updateReservation(r.id, edit(0, 60, "By admin"), admin, LONG_BEFORE)).ok).toBe(true);
  });

  it("locks the start of an ongoing booking but lets the end change (BR12)", async () => {
    const [running] = await db
      .insert(reservations)
      .values({ resourceId: roomA, userId: owner.id, title: "Running", startsAt: at(0), endsAt: at(60) })
      .returning();
    if (!running) throw new Error("setup failed");
    const now = at(30);
    expect(await updateReservation(running.id, edit(15, 60), owner, now)).toMatchObject({ ok: false, error: { code: "START_LOCKED" } });
    expect((await updateReservation(running.id, edit(0, 90), owner, now)).ok).toBe(true);
  });

  it("makes an ended booking read-only (BR12)", async () => {
    const r = await book("Done", 0, 60);
    expect(await updateReservation(r.id, edit(0, 60), owner, at(120))).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", reason: "This reservation has already ended." },
    });
  });
});

describe("cancel and restore", () => {
  it("cancels once; a second cancel is refused", async () => {
    const r = await book("Cancel me", 0, 60);
    expect((await cancelReservation(r.id, owner, LONG_BEFORE)).ok).toBe(true);
    expect((await cancelReservation(r.id, owner, LONG_BEFORE)).ok).toBe(false);
  });

  it("restores a cancelled booking when the slot is still free", async () => {
    const r = await book("Undo me", 0, 60);
    await cancelReservation(r.id, owner, LONG_BEFORE);
    expect((await restoreReservation(r.id, owner, LONG_BEFORE)).ok).toBe(true);
  });

  it("refuses to restore when someone took the slot meanwhile", async () => {
    const r = await book("Undo me", 0, 60);
    await cancelReservation(r.id, owner, LONG_BEFORE);
    await book("Took it", 0, 60, other);
    expect(await restoreReservation(r.id, owner, LONG_BEFORE)).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });
});

describe("conflict suggestions", () => {
  it("offers the same time elsewhere and the next free slot here", async () => {
    await book("Held", 0, 60, other); // Room A, 0-60
    const result = await createReservation({ resourceId: roomA, title: "Clash", startsAt: at(30), endsAt: at(90) }, owner.id);
    if (result.ok || result.error.code !== "CONFLICT") throw new Error("expected CONFLICT");

    expect(result.error.suggestions).toContainEqual(
      expect.objectContaining({ kind: "same-time-elsewhere", resourceId: roomB, start: at(30), end: at(90) }),
    );
    expect(result.error.suggestions).toContainEqual(
      expect.objectContaining({ kind: "next-free", resourceId: roomA, start: at(60), end: at(120) }),
    );
  });
});