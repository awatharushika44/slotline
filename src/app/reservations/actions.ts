"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { RuleViolation } from "@/lib/domain/booking-rules";
import { describeReservationError } from "@/lib/reservation-messages";
import type { SaveResult, SimpleResult, SuggestionDto } from "@/lib/reservation-dto";
import {
  cancelReservation,
  createReservation,
  restoreReservation,
  updateReservation,
  type ReservationResult,
  type Suggestion,
} from "@/lib/services/reservation-service";
import { formatDayLabel, formatRange } from "@/lib/time/format";
import { colomboLocalToInstant, ymdInColombo } from "@/lib/time/zone";
import { isUuid } from "@/lib/validation/ids";
import { makeReservationInputSchema, reservationUpdateSchema } from "@/lib/validation/reservation";
import { getReservationHistory, type HistoryResult } from "@/lib/services/audit-service";


const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const FIELD_NAMES: Record<string, string> = { startsAt: "startsAtLocal", endsAt: "endsAtLocal" };

function revalidateAll() {
  for (const path of ["/", "/timeline", "/reservations"]) revalidatePath(path);
}

/** A chip sends exact instants; the normal form sends Colombo wall-clock text. */
function readInstant(data: FormData, overrideKey: string, localKey: string): Date | null {
  const override = text(data, overrideKey);
  if (override) {
    const date = new Date(override);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  try {
    return colomboLocalToInstant(text(data, localKey));
  } catch {
    return null;
  }
}

function renameFields(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.length) out[FIELD_NAMES[key] ?? key] = messages;
  }
  return out;
}

const invalid = (fieldErrors: Record<string, string[]>): SaveResult => ({
  status: "invalid",
  fieldErrors,
  message: "Please fix the highlighted fields.",
});

function windowErrors(violations: RuleViolation[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const v of violations) (out[FIELD_NAMES[v.field] ?? v.field] ??= []).push(v.message);
  return out;
}

function toSuggestionDto(s: Suggestion, requestedStart: Date): SuggestionDto {
  const sameDay = ymdInColombo(s.start) === ymdInColombo(requestedStart);
  const when = `${sameDay ? "" : `${formatDayLabel(ymdInColombo(s.start))} `}${formatRange(s.start, s.end)}`;
  return {
    kind: s.kind,
    resourceId: s.resourceId,
    startIso: s.start.toISOString(),
    endIso: s.end.toISOString(),
    label: `${s.resourceName} · ${when}`,
  };
}

function toSaveResult(result: ReservationResult, requestedStart: Date, successMessage: string): SaveResult {
  if (result.ok) {
    revalidateAll();
    return { status: "success", message: successMessage };
  }
  const { error } = result;
  if (error.code === "CONFLICT") {
    return {
      status: "conflict",
      conflicts: error.conflicts.map((c) => ({ title: c.title, holderName: c.holderName, window: formatRange(c.start, c.end) })),
      suggestions: error.suggestions.map((s) => toSuggestionDto(s, requestedStart)),
    };
  }
  if (error.code === "INVALID_WINDOW") return invalid(windowErrors(error.violations));
  return { status: "error", message: describeReservationError(error) };
}

export async function saveReservationAction(data: FormData): Promise<SaveResult> {
  const startsAt = readInstant(data, "slotStart", "startsAtLocal");
  const endsAt = readInstant(data, "slotEnd", "endsAtLocal");
  if (!startsAt || !endsAt) {
    const fieldErrors: Record<string, string[]> = {};
    if (!startsAt) fieldErrors.startsAtLocal = ["Enter a valid start date and time."];
    if (!endsAt) fieldErrors.endsAtLocal = ["Enter a valid end date and time."];
    return invalid(fieldErrors);
  }

  const actor = await getCurrentUser();
  const now = new Date();
  const reservationId = text(data, "reservationId");
  const common = {
    title: text(data, "title"),
    notes: text(data, "notes") || undefined,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };

  if (reservationId) {
    if (!isUuid(reservationId)) return { status: "error", message: "Unknown reservation." };
    const parsed = reservationUpdateSchema.safeParse(common);
    if (!parsed.success) return invalid(renameFields(z.flattenError(parsed.error).fieldErrors));
    return toSaveResult(await updateReservation(reservationId, parsed.data, actor, now), startsAt, "Booking updated.");
  }

  const resourceId = text(data, "slotResourceId") || text(data, "resourceId");
  const parsed = makeReservationInputSchema(now).safeParse({ ...common, resourceId });
  if (!parsed.success) return invalid(renameFields(z.flattenError(parsed.error).fieldErrors));
  return toSaveResult(await createReservation(parsed.data, actor.id), startsAt, "Booking confirmed.");
}

export async function cancelReservationAction(id: string): Promise<SimpleResult> {
  if (!isUuid(id)) return { ok: false, message: "Unknown reservation." };
  const result = await cancelReservation(id, await getCurrentUser(), new Date());
  if (!result.ok) return { ok: false, message: describeReservationError(result.error) };
  revalidateAll();
  return { ok: true };
}

export async function restoreReservationAction(id: string): Promise<SimpleResult> {
  if (!isUuid(id)) return { ok: false, message: "Unknown reservation." };
  const result = await restoreReservation(id, await getCurrentUser(), new Date());
  if (!result.ok) {
    const message =
      result.error.code === "CONFLICT"
        ? "Could not undo: someone booked that time in the meantime."
        : describeReservationError(result.error);
    return { ok: false, message };
  }
  revalidateAll();
  return { ok: true };
}

export async function getHistoryAction(id: string): Promise<HistoryResult> {
  if (!isUuid(id)) return { ok: false, message: "Unknown reservation." };
  return getReservationHistory(id, await getCurrentUser());
}