import { z } from "zod";
import { RESOURCE_CATEGORIES } from "@/lib/domain/resource-categories";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long (max ${max} characters).`)
    .transform((value) => (value === "" ? null : value));

export const resourceInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name is too long (max 80 characters)."),
  category: z.enum(RESOURCE_CATEGORIES, { error: "Choose a category." }),
  capacity: z.coerce
    .number({ error: "Capacity must be a number." })
    .int("Capacity must be a whole number.")
    .min(1, "Capacity must be at least 1.")
    .max(1000, "Capacity is too large."),
  location: optionalText(120, "Location"),
  description: optionalText(500, "Description"),
});

export type ResourceInput = z.infer<typeof resourceInputSchema>;