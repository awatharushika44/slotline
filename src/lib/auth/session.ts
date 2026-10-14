import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "slotline_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters. See .env.example.");
  }
  return value;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionToken(userId: string, now: Date = new Date()): string {
  const expires = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id, or null for anything forged, malformed or expired. */
export function readSessionToken(token: string, now: Date = new Date()): string | null {
  const [userId, expires, signature, ...extra] = token.split(".");
  if (!userId || !expires || !signature || extra.length > 0) return null;

  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  if (!(Number(expires) * 1000 > now.getTime())) return null; // also rejects NaN
  return userId;
}