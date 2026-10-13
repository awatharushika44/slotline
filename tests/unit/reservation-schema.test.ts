import { describe, expect, it } from "vitest";
import { makeReservationInputSchema } from "@/lib/validation/reservation";

const now = new Date("2030-01-01T00:00:00.000Z");
const schema = makeReservationInputSchema(now);
const valid = {
  resourceId: "6f1c2f1e-8a3b-4c5d-9e7f-0a1b2c3d4e5f",
  title: "Weekly planning",
  startsAt: "2030-01-01T10:00:00.000Z",
  endsAt: "2030-01-01T11:00:00.000Z",
};

describe("reservation input schema", () => {
  it("accepts valid input and converts times to Date", () => {
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.startsAt).toBeInstanceOf(Date);
  });
  it("rejects an empty title", () => {
    expect(schema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });
  it("reports rule violations on the right field", () => {
    const result = schema.safeParse({ ...valid, endsAt: "2030-01-01T09:00:00.000Z" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["endsAt"]);
  });
});