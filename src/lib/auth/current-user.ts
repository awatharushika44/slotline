import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain/actor";
import { isUuid } from "@/lib/validation/ids";

export const DEMO_USER_COOKIE = "slotline_demo_user";

export interface CurrentUser extends Actor {
  name: string;
  email: string;
}

const columns = { id: users.id, name: users.name, email: users.email, role: users.role };

/** `cache` makes layout and page share one lookup per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const wanted = (await cookies()).get(DEMO_USER_COOKIE)?.value;
  if (wanted && isUuid(wanted)) {
    const [found] = await db
      .select(columns)
      .from(users)
      .where(and(eq(users.id, wanted), eq(users.isActive, true)))
      .limit(1);
    if (found) return found;
  }
  const [admin] = await db
    .select(columns)
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
    .limit(1);
  if (!admin) throw new Error("No users found. Run `npm run db:seed` first.");
  return admin;
});