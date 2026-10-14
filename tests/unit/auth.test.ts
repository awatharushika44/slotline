import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, readSessionToken } from "@/lib/auth/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "unit-test-secret-".padEnd(40, "x");
});

describe("passwords", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });
  it("salts: the same password gives different hashes", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
  it("never throws on a malformed stored hash", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("session tokens", () => {
  const now = new Date("2030-01-01T00:00:00.000Z");
  const userId = "6f1c2f1e-8a3b-4c5d-9e7f-0a1b2c3d4e5f";
  const hours = (n: number) => new Date(now.getTime() + n * 3_600_000);

  it("round-trips a user id", () => {
    expect(readSessionToken(createSessionToken(userId, now), now)).toBe(userId);
  });
  it("rejects a token for a different user (forged id)", () => {
    const [, expires, signature] = createSessionToken(userId, now).split(".");
    const forged = `00000000-0000-4000-8000-000000000000.${expires}.${signature}`;
    expect(readSessionToken(forged, now)).toBeNull();
  });
  it("rejects an extended expiry", () => {
    const [id, , signature] = createSessionToken(userId, now).split(".");
    expect(readSessionToken(`${id}.9999999999.${signature}`, now)).toBeNull();
  });
  it("expires after 8 hours", () => {
    const token = createSessionToken(userId, now);
    expect(readSessionToken(token, hours(7))).toBe(userId);
    expect(readSessionToken(token, hours(9))).toBeNull();
  });
  it("rejects a token signed with another secret", () => {
    const token = createSessionToken(userId, now);
    process.env.SESSION_SECRET = "another-secret-".padEnd(40, "y");
    expect(readSessionToken(token, now)).toBeNull();
    process.env.SESSION_SECRET = "unit-test-secret-".padEnd(40, "x");
  });
});