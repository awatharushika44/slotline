import "./setup-env"; // must stay first
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/lib/db/client";
import { reservations } from "@/lib/db/schema";
import { createReservation } from "@/lib/services/reservation-service";
import { createResource, setResourceActive } from "@/lib/services/resource-service";
import { createResourceRow, createUser, migrateTestDatabase, resetDatabase } from "./helpers";

const input = { name: "Boardroom A", category: "room" as const, capacity: 12, location: null, description: null };
const START = new Date("2035-03-10T04:30:00.000Z");
const hours = (n: number) => new Date(START.getTime() + n * 3_600_000);

beforeAll(migrateTestDatabase);
beforeEach(resetDatabase);
afterAll(() => pool.end());

describe("resource service", () => {
  it("lets only admins create resources", async () => {
    const member = await createUser("member");
    expect(await createResource(input, member)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("rejects a duplicate name, ignoring case", async () => {
    const admin = await createUser("admin");
    expect((await createResource(input, admin)).ok).toBe(true);
    expect(await createResource({ ...input, name: "boardroom a" }, admin)).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_NAME" },
    });
  });

  it("archiving blocks new bookings but keeps existing ones (BR6, BR7)", async () => {
    const admin = await createUser("admin");
    const member = await createUser("member");
    const resource = await createResourceRow();

    const first = await createReservation({ resourceId: resource.id, title: "Existing", startsAt: hours(0), endsAt: hours(1) }, member.id);
    expect(first.ok).toBe(true);

    expect((await setResourceActive(resource.id, false, admin)).ok).toBe(true);

    const later = await createReservation({ resourceId: resource.id, title: "New", startsAt: hours(2), endsAt: hours(3) }, member.id);
    expect(later).toMatchObject({ ok: false, error: { code: "RESOURCE_INACTIVE" } });

    const rows = await db.select().from(reservations);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("active");
  });

  it("a member cannot archive, and restoring makes the resource bookable again", async () => {
    const admin = await createUser("admin");
    const member = await createUser("member");
    const resource = await createResourceRow();

    expect(await setResourceActive(resource.id, false, member)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    await setResourceActive(resource.id, false, admin);
    await setResourceActive(resource.id, true, admin);

    const booked = await createReservation({ resourceId: resource.id, title: "Back in service", startsAt: hours(0), endsAt: hours(1) }, member.id);
    expect(booked.ok).toBe(true);
  });
});