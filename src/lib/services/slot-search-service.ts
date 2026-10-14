import { listBusyForResources } from "@/lib/db/reservation-repo";
import { listActiveResources } from "@/lib/db/resource-repo";
import { findNextSlots, type Slot } from "@/lib/domain/find-slots";
import type { ResourceCategory } from "@/lib/domain/resource-categories";
import { WORKDAY_END, WORKDAY_START } from "@/lib/domain/working-hours";
import { addDaysYmd, colomboInstant, dayRangeUtc, todayInColombo } from "@/lib/time/zone";

const HEADROOM_MS = 5 * 60_000; // a suggested start must not already be "past" when the user clicks

export interface FoundSlot extends Slot {
  resourceName: string;
}

export async function findSlots(options: {
  durationMinutes: number;
  category?: ResourceCategory;
  now: Date;
  days?: number;
  limit?: number;
}): Promise<FoundSlot[]> {
  const { durationMinutes, category, now, days = 3, limit = 6 } = options;

  const resources = (await listActiveResources()).filter((r) => !category || r.category === category);
  if (resources.length === 0) return [];

  const today = todayInColombo(now);
  const horizon = dayRangeUtc(addDaysYmd(today, days)).start;
  const busy = await listBusyForResources(resources.map((r) => r.id), { start: now, end: horizon });
  const earliest = new Date(now.getTime() + HEADROOM_MS);

  const found: Slot[] = [];
  for (let offset = 0; offset < days; offset++) {
    const ymd = addDaysYmd(today, offset);
    const open = colomboInstant(ymd, WORKDAY_START);
    const close = colomboInstant(ymd, WORKDAY_END);
    const from = open.getTime() > earliest.getTime() ? open : earliest;
    if (from.getTime() >= close.getTime()) continue;

    found.push(
      ...findNextSlots({
        resources: resources.map((r) => ({ resourceId: r.id, busy: busy.get(r.id) ?? [] })),
        durationMinutes,
        from,
        until: close,
        limit: Number.POSITIVE_INFINITY,
      }),
    );
  }

  const names = new Map(resources.map((r) => [r.id, r.name]));
  return found
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.resourceId.localeCompare(b.resourceId))
    .slice(0, limit)
    .map((slot) => ({ ...slot, resourceName: names.get(slot.resourceId) ?? "Unknown" }));
}