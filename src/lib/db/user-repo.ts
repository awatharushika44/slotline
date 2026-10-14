import { and, asc, eq } from "drizzle-orm";
import { db } from "./client";
import { users } from "./schema";

const publicColumns = { id: users.id, name: users.name, email: users.email, role: users.role };

export async function getActiveUserById(id: string) {
  const [row] = await db
    .select(publicColumns)
    .from(users)
    .where(and(eq(users.id, id), eq(users.isActive, true)))
    .limit(1);
  return row;
}

export async function findUserForLogin(email: string) {
  const [row] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row;
}

export async function listActiveUsers() {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.name));
}