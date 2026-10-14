import { sql } from "drizzle-orm";
import { DEMO_PASSWORD } from "../src/lib/auth/demo";
import { hashPassword } from "../src/lib/auth/password";
import { db, pool } from "../src/lib/db/client";
import { reservationEvents, reservations, resources, users } from "../src/lib/db/schema";
import { addDaysYmd, colomboInstant, todayInColombo } from "../src/lib/time/zone";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed: this script wipes all data.");
}

const today = todayInColombo();
const at = (dayOffset: number, time: string) => colomboInstant(addDaysYmd(today, dayOffset), time);

// Each user gets its own random salt, so the hashes all differ.
const hash = () => hashPassword(DEMO_PASSWORD);

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
      { email: "amaya@slotline.test", name: "Amaya Fernando", role: "admin", passwordHash: await hash() },
      { email: "kasun@slotline.test", name: "Kasun Silva", passwordHash: await hash() },
      { email: "dilini@slotline.test", name: "Dilini Jayawardena", passwordHash: await hash() },
      { email: "ruwan@slotline.test", name: "Ruwan Perera", passwordHash: await hash() },
      { email: "sachini@slotline.test", name: "Sachini Wickramasinghe", passwordHash: await hash() },
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

  const userByKey = new Map(userRows.map((u) => [u.email.split("@")[0], u] as const));
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

  // Hand-picked bookings: they tell a story for the demo.
  const handPicked = [
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
  ];

  // Deterministic pseudo-random history (same data every run), so insights look real.
  function lcg(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }
  const rand = lcg(42);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T;
  const hhmm = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const people = ["amaya", "kasun", "dilini", "ruwan", "sachini"] as const;
  const topics = ["Team sync", "Client call", "Workshop", "Interview", "Planning", "Training", "Site visit"] as const;

  const history: (typeof reservations.$inferInsert)[] = [];
  for (let day = -21; day <= -1; day++) {
    for (const resource of resourceRows.filter((r) => r.isActive)) {
      let cursor = 8 * 60;
      while (cursor < 17 * 60) {
        if (rand() < 0.4) {
          const length = pick([30, 60, 60, 90, 120]);
          history.push(
            booking(resource.name, pick(people), pick(topics), at(day, hhmm(cursor)), at(day, hhmm(cursor + length))),
          );
          cursor += length; // next booking starts later, so history never overlaps itself
        }
        cursor += 30;
      }
    }
  }

  const inserted = await db.insert(reservations).values([...handPicked, ...history]).returning();

  await db.insert(reservationEvents).values(
    inserted.flatMap((r) => {
      const events: (typeof reservationEvents.$inferInsert)[] = [
        {
          reservationId: r.id,
          actorId: r.userId,
          eventType: "created",
          details: { after: { resourceId: r.resourceId, title: r.title, startsAt: r.startsAt, endsAt: r.endsAt } },
        },
      ];
      if (r.status === "cancelled") {
        events.push({
          reservationId: r.id,
          actorId: r.userId,
          eventType: "cancelled",
          details: { before: { status: "active" }, after: { status: "cancelled" } },
        });
      }
      return events;
    }),
  );

  console.log(`Seeded ${userRows.length} users, ${resourceRows.length} resources, ${inserted.length} reservations.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());