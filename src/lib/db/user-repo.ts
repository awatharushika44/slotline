import { asc, eq } from "drizzle-orm";
import { db } from "./client";
import { users } from "./schema";

export async function listActiveUsers() {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.name));
}