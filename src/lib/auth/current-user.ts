import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getActiveUserById } from "@/lib/db/user-repo";
import type { Actor } from "@/lib/domain/actor";
import { isUuid } from "@/lib/validation/ids";
import { readSessionToken, SESSION_COOKIE } from "./session";

export interface CurrentUser extends Actor {
  name: string;
  email: string;
}

/** The signed-in user, or null. `cache` = one lookup per request. Used by the layout. */
export const getSessionUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = readSessionToken(token);
  if (!userId || !isUuid(userId)) return null;
  return (await getActiveUserById(userId)) ?? null;
});

/** For pages and actions that need a user: no session means redirect to /login. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}