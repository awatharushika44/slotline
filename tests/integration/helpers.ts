import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/lib/db/client";
import { resources, users } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain/actor";

export async function migrateTestDatabase() {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

export async function resetDatabase() {
  await db.execute(sql`TRUNCATE reservation_events, reservations, resources, users RESTART IDENTITY`);
}

export async function createUser(role: Actor["role"] = "member", name = "Test User") {
  const [row] = await db
    .insert(users)
    .values({ email: `${randomUUID()}@slotline.test`, name, role, passwordHash: "x" })
    .returning();
  if (!row) throw new Error("createUser failed");
  return { id: row.id, role: row.role, name: row.name };
}

export async function createResourceRow(
  name = "Test Room",
  options: { isActive?: boolean; category?: "room" | "equipment" | "vehicle" | "other" } = {},
) {
  const [row] = await db
    .insert(resources)
    .values({ name, category: options.category ?? "room", isActive: options.isActive ?? true })
    .returning();
  if (!row) throw new Error("createResourceRow failed");
  return row;
}