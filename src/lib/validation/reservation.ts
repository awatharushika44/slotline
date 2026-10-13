import { z } from "zod";
import { validateBookingWindow } from "@/lib/domain/booking-rules";

const isoInstant = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const fields = {
  title: z.string().trim().min(1, "Title is required.").max(120, "Title is too long (max 120 characters)."),
  notes: z.string().trim().max(1000, "Notes are too long (max 1000 characters).").optional(),
  startsAt: isoInstant,
  endsAt: isoInstant,
};

export function makeReservationInputSchema(now: Date = new Date()) {
  return z
    .object({ resourceId: z.uuid(), ...fields })
    .superRefine((value, ctx) => {
      for (const violation of validateBookingWindow({ start: value.startsAt, end: value.endsAt }, now)) {
        ctx.addIssue({ code: "custom", message: violation.message, path: [violation.field] });
      }
    });
}

/** Shape only. Window rules for EDITS depend on the stored booking, so the service applies them. */
export const reservationUpdateSchema = z.object(fields);

export type ReservationInput = z.infer<ReturnType<typeof makeReservationInputSchema>>;
export type ReservationUpdateInput = z.infer<typeof reservationUpdateSchema>;