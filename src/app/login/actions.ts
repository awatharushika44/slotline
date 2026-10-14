"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { findUserForLogin } from "@/lib/db/user-repo";

export interface LoginState {
  message?: string;
  email?: string;
}

// A well-formed hash of nothing. Unknown emails still pay the same scrypt cost,
// so response time does not reveal which emails exist.
const DUMMY_HASH = `scrypt$${"00".repeat(16)}$${"00".repeat(64)}`;

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = email ? await findUserForLogin(email) : undefined;
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  // One message for every failure: never reveal whether the email exists.
  if (!user || !user.isActive || !passwordOk) {
    return { email, message: "Wrong email or password." };
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect("/"); // outside any try/catch: redirect works by throwing
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}