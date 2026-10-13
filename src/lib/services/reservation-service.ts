import { isExclusionViolation } from "@/lib/db/errors";
import {
  insertReservationWithEvent,
  listActiveInRange,
  type ConflictingReservation,
  type Reservation,
} from "@/lib/db/reservation-repo";
import { getResourceById } from "@/lib/db/resource-repo";
import type { ReservationInput } from "@/lib/validation/reservation";

export type ReservationError =
  | { code: "RESOURCE_NOT_FOUND" }
  | { code: "RESOURCE_INACTIVE" }
  | { code: "CONFLICT"; conflicts: ConflictingReservation[] };

export type CreateReservationResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; error: ReservationError };

/** `input` must already be validated by the Zod schema at the boundary. */
export async function createReservation(
  input: ReservationInput,
  actorId: string,
): Promise<CreateReservationResult> {
  const resource = await getResourceById(input.resourceId);

  if (!resource) {
    return { ok: false, error: { code: "RESOURCE_NOT_FOUND" } };
  }

  if (!resource.isActive) {
    return { ok: false, error: { code: "RESOURCE_INACTIVE" } };
  }

  try {
    const reservation = await insertReservationWithEvent(
      {
        resourceId: input.resourceId,
        userId: actorId,
        title: input.title,
        notes: input.notes || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
      actorId,
    );

    return { ok: true, reservation };
  } catch (error) {
    if (!isExclusionViolation(error)) {
      throw error;
    }

    const conflicts = await listActiveInRange(input.resourceId, {
      start: input.startsAt,
      end: input.endsAt,
    });

    return { ok: false, error: { code: "CONFLICT", conflicts } };
  }
}