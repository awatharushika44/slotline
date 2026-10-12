import { sql } from "drizzle-orm";
import { db, pool } from "../src/lib/db/client";
import { reservations, resources, users } from "../src/lib/db/schema";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed: this script wipes all data.");
}

const PLACEHOLDER_HASH = "not-a-real-hash";

const todayInColombo = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Colombo",
}).format(new Date());

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function at(dayOffset: number, time: string): Date {
  return new Date(`${addDays(todayInColombo, dayOffset)}T${time}:00+05:30`);
}

function must<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Seed error: missing ${label}`);
  return value;
}

async function main() {
  await db.execute(
    sql`TRUNCATE reservation_events, reservations, resources, users RESTART IDENTITY`,
  );

  const userRows = await db
    .insert(users)
    .values([
      { email: "amaya@slotline.test", name: "Amaya Fernando", role: "admin", passwordHash: PLACEHOLDER_HASH },
      { email: "kasun@slotline.test", name: "Kasun Silva", passwordHash: PLACEHOLDER_HASH },
      { email: "dilini@slotline.test", name: "Dilini Jayawardena", passwordHash: PLACEHOLDER_HASH },
      { email: "ruwan@slotline.test", name: "Ruwan Perera", passwordHash: PLACEHOLDER_HASH },
      { email: "sachini@slotline.test", name: "Sachini Wickramasinghe", passwordHash: PLACEHOLDER_HASH },
    ])
    .returning();

  const resourceRows = await db
    .insert(resources)
    .values([
      { name: "Boardroom A", category: "room", capacity: 12, location: "Floor 3", description: "Large boardroom with video conferencing" },
      { name: "Meeting Room B", category: "room", capacity: 6, location: "Floor 2", description: "Small meeting room with whiteboard" },
      { name: "Training Lab", category: "room", capacity: 20, location: "Floor 1", description: "Computer lab for workshops" },
      { name: "Projector Kit", category: "equipment", capacity: 1, location: "Store room", description: "Portable projector with screen" },
      { name: "Camera Kit", category: "equipment", capacity: 1, location: "Store room", description: "DSLR camera, tripod and lights" },
      { name: "Company Van", category: "vehicle", capacity: 8, location: "Parking level 1", description: "8-seat van" },
      { name: "Pool Car", category: "vehicle", capacity: 4, location: "Parking level 1", description: "Sedan for short trips" },
      { name: "Old Annex Hall", category: "room", capacity: 40, location: "Annex", description: "Closed for renovation", isActive: false },
    ])
    .returning();

  const userByKey = new Map(
    userRows.map((u) => [u.email.split("@")[0], u] as const),
  );
  const resourceByName = new Map(resourceRows.map((r) => [r.name, r] as const));

  function booking(
    resourceName: string,
    userKey: string,
    title: string,
    startsAt: Date,
    endsAt: Date,
    status: "active" | "cancelled" = "active",
  ): typeof reservations.$inferInsert {
    return {
      resourceId: must(resourceByName.get(resourceName), resourceName).id,
      userId: must(userByKey.get(userKey), userKey).id,
      title,
      startsAt,
      endsAt,
      status,
    };
  }

  await db.insert(reservations).values([
    booking("Old Annex Hall", "amaya", "Quarterly town hall", at(-3, "10:00"), at(-3, "12:00")),

    booking("Boardroom A", "amaya", "Weekly planning", at(0, "09:00"), at(0, "10:00")),
    booking("Boardroom A", "kasun", "Client presentation prep", at(0, "10:00"), at(0, "11:30")),
    booking("Boardroom A", "dilini", "Design review", at(0, "14:00"), at(0, "15:30")),
    booking("Boardroom A", "ruwan", "Hiring panel", at(1, "09:30"), at(1, "11:00")),

    booking("Meeting Room B", "sachini", "1:1 catch-up", at(0, "11:00"), at(0, "11:30")),
    booking("Meeting Room B", "kasun", "Budget sync", at(0, "11:00"), at(0, "11:30"), "cancelled"),
    booking("Meeting Room B", "kasun", "Sprint retro", at(0, "15:00"), at(0, "16:00")),
    booking("Meeting Room B", "ruwan", "Vendor call", at(1, "13:00"), at(1, "14:00")),

    booking("Training Lab", "amaya", "Onboarding workshop", at(1, "09:00"), at(1, "12:00")),
    booking("Training Lab", "dilini", "Python bootcamp", at(1, "13:30"), at(1, "16:30")),
    booking("Training Lab", "sachini", "Intern orientation", at(2, "10:00"), at(2, "12:00")),

    booking("Projector Kit", "kasun", "Roadshow demo", at(0, "13:00"), at(0, "17:00")),
    booking("Projector Kit", "amaya", "Workshop projector", at(1, "08:30"), at(1, "12:30")),

    booking("Camera Kit", "kasun", "Product shoot", at(2, "09:00"), at(2, "13:00")),

    booking("Company Van", "ruwan", "Site visit, Galle", at(1, "07:30"), at(1, "15:30")),
    booking("Company Van", "dilini", "Airport pickup (overnight)", at(1, "22:00"), at(2, "02:00")),

    booking("Pool Car", "sachini", "Bank run", at(0, "12:00"), at(0, "13:00")),
  ]);

  console.log(`Seeded ${userRows.length} users, ${resourceRows.length} resources.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());