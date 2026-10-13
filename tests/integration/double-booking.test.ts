import "./setup-env"; // Must stay first: configure the TEST database before importing the DB client.

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import {
afterAll,
beforeAll,
beforeEach,
describe,
expect,
it,
} from "vitest";
import { db, pool } from "@/lib/db/client";
import { isExclusionViolation } from "@/lib/db/errors";
import { reservations, resources, users } from "@/lib/db/schema";
import { createReservation } from "@/lib/services/reservation-service";

const CONCURRENT_REQUESTS = 20;
const BASE = new Date("2035-03-10T04:30:00.000Z");

function slot(startMinutes: number, lengthMinutes: number) {
const startsAt = new Date(BASE.getTime() + startMinutes * 60_000);
const endsAt = new Date(startsAt.getTime() + lengthMinutes * 60_000);

return { startsAt, endsAt };
}

let resourceId = "";
let userId = "";

beforeAll(
async () => {
const result = await db.execute(
sql`SELECT current_database() AS name`,
);


const databaseName = result.rows[0]?.name;

if (databaseName !== "slotline_test") {
  throw new Error(
    `Unsafe test database: expected slotline_test, got ${String(databaseName)}`,
  );
}

await migrate(db, { migrationsFolder: "./drizzle" });


},
30000,
);

beforeEach(
async () => {
await db.execute(
sql`TRUNCATE TABLE reservation_events, reservations, resources, users RESTART IDENTITY`,
);


const [user] = await db
  .insert(users)
  .values({
    email: "test@slotline.test",
    name: "Test User",
    passwordHash: "x",
  })
  .returning();

const [resource] = await db
  .insert(resources)
  .values({
    name: "Test Room",
    category: "room",
  })
  .returning();

if (!user || !resource) {
  throw new Error("Test setup failed.");
}

userId = user.id;
resourceId = resource.id;


},
15000,
);

afterAll(async () => {
await pool.end();
}, 15000);

describe("double booking is impossible", () => {
it(
`through the service: ${CONCURRENT_REQUESTS} simultaneous requests, exactly 1 succeeds`,
async () => {
const results = await Promise.all(
Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
createReservation(
{
resourceId,
title: `Request ${i + 1}`,
...slot(0, 60),
},
userId,
),
),
);


  const succeeded = results.filter((r) => r.ok);
  const conflicts = results.filter(
    (r) => !r.ok && r.error.code === "CONFLICT",
  );

  expect(succeeded).toHaveLength(1);
  expect(conflicts).toHaveLength(CONCURRENT_REQUESTS - 1);
  expect(await db.select().from(reservations)).toHaveLength(1);
},
20000,


);

it(
"at the database level alone: raw inserts, 19 rejected with error 23P01",
async () => {
const attempts = await Promise.allSettled(
Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
db.insert(reservations).values({
resourceId,
userId,
title: `Raw ${i + 1}`,
...slot(0, 60),
}),
),
);

  const rejected = attempts.filter(
    (a): a is PromiseRejectedResult => a.status === "rejected",
  );

  expect(
    attempts.filter((a) => a.status === "fulfilled"),
  ).toHaveLength(1);

  expect(rejected).toHaveLength(CONCURRENT_REQUESTS - 1);

  expect(
    rejected.every((r) => isExclusionViolation(r.reason)),
  ).toBe(true);
},
20000,


);

it("allows back-to-back bookings at the same time", async () => {
const results = await Promise.all([
createReservation(
{ resourceId, title: "First", ...slot(0, 60) },
userId,
),
createReservation(
{ resourceId, title: "Second", ...slot(60, 60) },
userId,
),
]);


expect(results.every((r) => r.ok)).toBe(true);


});

it("frees the slot when a booking is cancelled", async () => {
const first = await createReservation(
{ resourceId, title: "Will cancel", ...slot(0, 60) },
userId,
);


expect(first.ok).toBe(true);

await db
  .update(reservations)
  .set({ status: "cancelled" });

const second = await createReservation(
  { resourceId, title: "Takes the slot", ...slot(0, 60) },
  userId,
);

expect(second.ok).toBe(true);

});

it("tells the user who holds the slot", async () => {
await createReservation(
{ resourceId, title: "Design review", ...slot(0, 60) },
userId,
);


const second = await createReservation(
  { resourceId, title: "Clash", ...slot(30, 60) },
  userId,
);

expect(second.ok).toBe(false);

if (!second.ok && second.error.code === "CONFLICT") {
  expect(second.error.conflicts[0]?.holderName).toBe("Test User");
  expect(second.error.conflicts[0]?.title).toBe("Design review");
}


});
});
