import { z } from "zod";
import { validateBookingWindow } from "@/lib/domain/booking-rules";

const isoInstant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export function makeReservationInputSchema(now: Date = new Date()) {
  return z
    .object({
      resourceId: z.uuid(),
      title: z.string().trim().min(1, "Title is required.").max(120, "Title is too long (max 120 characters)."),
      notes: z.string().trim().max(1000, "Notes are too long (max 1000 characters).").optional(),
      startsAt: isoInstant,
      endsAt: isoInstant,
    })
    .superRefine((value, ctx) => {
      const violations = validateBookingWindow(
        { start: value.startsAt, end: value.endsAt },
        now,
      );
      for (const violation of violations) {
        ctx.addIssue({ code: "custom", message: violation.message, path: [violation.field] });
      }
    });
}

export type ReservationInput = z.infer<ReturnType<typeof makeReservationInputSchema>>;