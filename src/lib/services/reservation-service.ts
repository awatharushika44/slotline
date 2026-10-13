import { isExclusionViolation } from "@/lib/db/errors";
import {
  getReservationById,
  insertReservationWithEvent,
  listActiveInRange,
  listBusyForResources,
  setStatusWithEvent,
  updateReservationWithEvent,
  type ConflictingReservation,
  type Reservation,
} from "@/lib/db/reservation-repo";
import { getResourceById, listActiveResources } from "@/lib/db/resource-repo";
import type { Actor } from "@/lib/domain/actor";
import {
  validateBookingWindow,
  type RuleViolation,
} from "@/lib/domain/booking-rules";
import { findNextSlots, type Slot } from "@/lib/domain/find-slots";
import type { TimeRange } from "@/lib/domain/overlap";
import { getReservationPermissions } from "@/lib/domain/reservation-policy";
import type {
  ReservationInput,
  ReservationUpdateInput,
} from "@/lib/validation/reservation";

export interface Suggestion extends Slot {
  resourceName: string;
  kind: "same-time-elsewhere" | "next-free";
}

export type ReservationError =
  | { code: "RESOURCE_NOT_FOUND" }
  | { code: "RESOURCE_INACTIVE" }
  | { code: "NOT_FOUND" }
  | { code: "FORBIDDEN"; reason: string }
  | { code: "START_LOCKED" }
  | { code: "STATE_CHANGED" }
  | { code: "INVALID_WINDOW"; violations: RuleViolation[] }
  | {
      code: "CONFLICT";
      conflicts: ConflictingReservation[];
      suggestions: Suggestion[];
    };

export type ReservationResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; error: ReservationError };

const fail = (error: ReservationError): ReservationResult => ({
  ok: false,
  error,
});

const SUGGESTION_HORIZON_MS = 3 * 24 * 3_600_000;

function permissionsFor(
  existing: Reservation,
  actor: Actor,
  now: Date,
) {
  return getReservationPermissions(
    {
      ownerId: existing.userId,
      status: existing.status,
      range: {
        start: existing.startsAt,
        end: existing.endsAt,
      },
    },
    actor,
    now,
  );
}

/** Suggest up to 2 same-time alternatives and 2 next-free slots. */
async function suggestAlternatives(
  resourceId: string,
  range: TimeRange,
  ignoreId?: string,
): Promise<Suggestion[]> {
  const resources = await listActiveResources();
  const current = resources.find((resource) => resource.id === resourceId);

  if (!current) {
    return [];
  }

  const names = new Map(
    resources.map((resource) => [resource.id, resource.name]),
  );

  const horizonEnd = new Date(
    range.start.getTime() + SUGGESTION_HORIZON_MS,
  );

  const busy = await listBusyForResources(
    resources.map((resource) => resource.id),
    {
      start: range.start,
      end: horizonEnd,
    },
    ignoreId,
  );

  const busyOf = (id: string) => busy.get(id) ?? [];

  const durationMinutes =
    (range.end.getTime() - range.start.getTime()) / 60_000;

  const elsewhere = findNextSlots({
    resources: resources
      .filter(
        (resource) =>
          resource.id !== resourceId &&
          resource.category === current.category,
      )
      .map((resource) => ({
        resourceId: resource.id,
        busy: busyOf(resource.id),
      })),
    durationMinutes,
    from: range.start,
    until: range.end,
    limit: 2,
  });

  const later = findNextSlots({
    resources: [
      {
        resourceId,
        busy: busyOf(resourceId),
      },
    ],
    durationMinutes,
    from: range.start,
    until: horizonEnd,
    limit: 2,
  });

  const label =
    (kind: Suggestion["kind"]) =>
    (slot: Slot): Suggestion => ({
      ...slot,
      kind,
      resourceName: names.get(slot.resourceId) ?? "Unknown",
    });

  return [
    ...elsewhere.map(label("same-time-elsewhere")),
    ...later.map(label("next-free")),
  ];
}

async function conflictError(
  resourceId: string,
  range: TimeRange,
  ignoreId?: string,
): Promise<ReservationError> {
  const [conflicts, suggestions] = await Promise.all([
    listActiveInRange(resourceId, range, ignoreId),
    suggestAlternatives(resourceId, range, ignoreId),
  ]);

  return {
    code: "CONFLICT",
    conflicts,
    suggestions,
  };
}

/** The input must already be validated by the Zod schema at the boundary. */
export async function createReservation(
  input: ReservationInput,
  actorId: string,
): Promise<ReservationResult> {
  const resource = await getResourceById(input.resourceId);

  if (!resource) {
    return fail({ code: "RESOURCE_NOT_FOUND" });
  }

  if (!resource.isActive) {
    return fail({ code: "RESOURCE_INACTIVE" });
  }

  const range = {
    start: input.startsAt,
    end: input.endsAt,
  };

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

    return {
      ok: true,
      reservation,
    };
  } catch (error) {
    if (!isExclusionViolation(error)) {
      throw error;
    }

    return fail(await conflictError(input.resourceId, range));
  }
}

export async function updateReservation(
  id: string,
  input: ReservationUpdateInput,
  actor: Actor,
  now: Date = new Date(),
): Promise<ReservationResult> {
  const existing = await getReservationById(id);

  if (!existing) {
    return fail({ code: "NOT_FOUND" });
  }

  const permissions = permissionsFor(existing, actor, now);

  if (!permissions.canEdit) {
    return fail({
      code: "FORBIDDEN",
      reason: permissions.reason ?? "Not allowed.",
    });
  }

  if (
    permissions.startLocked &&
    input.startsAt.getTime() !== existing.startsAt.getTime()
  ) {
    return fail({ code: "START_LOCKED" });
  }

  const range = {
    start: input.startsAt,
    end: input.endsAt,
  };

  const violations = validateBookingWindow(range, now, {
    existingStart: existing.startsAt,
  });

  if (violations.length > 0) {
    return fail({
      code: "INVALID_WINDOW",
      violations,
    });
  }

  const resource = await getResourceById(existing.resourceId);

  if (!resource?.isActive) {
    return fail({ code: "RESOURCE_INACTIVE" });
  }

  try {
    const updated = await updateReservationWithEvent(
      id,
      {
        title: input.title,
        notes: input.notes || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
      actor.id,
      existing,
    );

    return updated
      ? { ok: true, reservation: updated }
      : fail({ code: "STATE_CHANGED" });
  } catch (error) {
    if (!isExclusionViolation(error)) {
      throw error;
    }

    return fail(
      await conflictError(existing.resourceId, range, id),
    );
  }
}

export async function cancelReservation(
  id: string,
  actor: Actor,
  now: Date = new Date(),
): Promise<ReservationResult> {
  const existing = await getReservationById(id);

  if (!existing) {
    return fail({ code: "NOT_FOUND" });
  }

  const permissions = permissionsFor(existing, actor, now);

  if (!permissions.canCancel) {
    return fail({
      code: "FORBIDDEN",
      reason: permissions.reason ?? "Not allowed.",
    });
  }

  const row = await setStatusWithEvent(
    id,
    "active",
    "cancelled",
    actor.id,
  );

  return row
    ? { ok: true, reservation: row }
    : fail({ code: "STATE_CHANGED" });
}

/** Restore a cancelled reservation; the slot may have been taken meanwhile. */
export async function restoreReservation(
  id: string,
  actor: Actor,
  now: Date = new Date(),
): Promise<ReservationResult> {
  const existing = await getReservationById(id);

  if (!existing) {
    return fail({ code: "NOT_FOUND" });
  }

  const permissions = permissionsFor(existing, actor, now);

  if (!permissions.canRestore) {
    return fail({
      code: "FORBIDDEN",
      reason: permissions.reason ?? "Not allowed.",
    });
  }

  const resource = await getResourceById(existing.resourceId);

  if (!resource?.isActive) {
    return fail({ code: "RESOURCE_INACTIVE" });
  }

  try {
    const row = await setStatusWithEvent(
      id,
      "cancelled",
      "active",
      actor.id,
    );

    return row
      ? { ok: true, reservation: row }
      : fail({ code: "STATE_CHANGED" });
  } catch (error) {
    if (!isExclusionViolation(error)) {
      throw error;
    }

    return fail(
      await conflictError(
        existing.resourceId,
        {
          start: existing.startsAt,
          end: existing.endsAt,
        },
        id,
      ),
    );
  }
}

