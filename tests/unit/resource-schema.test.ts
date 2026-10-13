import { describe, expect, it } from "vitest";
import { resourceCategory } from "@/lib/db/schema";
import { RESOURCE_CATEGORIES } from "@/lib/domain/resource-categories";
import { resourceInputSchema } from "@/lib/validation/resource";

const valid = { name: "  Boardroom A ", category: "room", capacity: "12", location: " Floor 3 ", description: "" };

describe("resource input schema", () => {
  it("trims, converts capacity to a number and turns empty optionals into null", () => {
    const result = resourceInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Boardroom A", category: "room", capacity: 12, location: "Floor 3", description: null });
    }
  });
  it("rejects capacity 0 and non-numbers", () => {
    expect(resourceInputSchema.safeParse({ ...valid, capacity: "0" }).success).toBe(false);
    expect(resourceInputSchema.safeParse({ ...valid, capacity: "many" }).success).toBe(false);
  });
  it("rejects an unknown category and a too-short name", () => {
    expect(resourceInputSchema.safeParse({ ...valid, category: "spaceship" }).success).toBe(false);
    expect(resourceInputSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });
  it("uses exactly the categories the database enum has", () => {
    expect([...RESOURCE_CATEGORIES]).toEqual([...resourceCategory.enumValues]);
  });
});