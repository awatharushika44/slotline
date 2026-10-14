import { AutoRefresh } from "@/components/auto-refresh";
import { DayNav } from "@/components/day-nav";
import { Timeline } from "@/components/timeline";
import type { TimelineRow } from "@/components/timeline-types";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/domain/actor";
import { ceilToGrid } from "@/lib/domain/find-slots";
import { CATEGORY_LABELS } from "@/lib/domain/resource-categories";
import { getReservationPermissions } from "@/lib/domain/reservation-policy";
import { fractionOfRange, placeOnRange } from "@/lib/domain/timeline-layout";
import { getDayView } from "@/lib/services/availability-service";
import { initialsOf } from "@/lib/text";
import { formatDayLabel, formatRange } from "@/lib/time/format";
import { instantToColomboLocal, isValidYmd, todayInColombo } from "@/lib/time/zone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Timeline" };

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const now = new Date();
  const today = todayInColombo(now);
  const ymd = date && isValidYmd(date) ? date : today;

  const [me, view] = await Promise.all([getCurrentUser(), getDayView(ymd)]);

  const rows: TimelineRow[] = view.resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    categoryLabel: CATEGORY_LABELS[resource.category],
    archived: !resource.isActive,
    blocks: view.reservations
      .filter((r) => r.resourceId === resource.id)
      .flatMap((r) => {
        const placement = placeOnRange({ start: r.start, end: r.end }, view.range);
        if (!placement) return [];
        const permissions = getReservationPermissions(
          { ownerId: r.userId, status: "active", range: { start: r.start, end: r.end } },
          me,
          now,
        );
        return [
          {
            id: r.id,
            resourceId: r.resourceId,
            title: r.title,
            notes: r.notes,
            holderName: r.holderName,
            initials: initialsOf(r.holderName),
            mine: r.userId === me.id,
            startsAtLocal: instantToColomboLocal(r.start),
            endsAtLocal: instantToColomboLocal(r.end),
            timeLabel: formatRange(r.start, r.end),
            ...placement,
            canEdit: permissions.canEdit,
            canCancel: permissions.canCancel,
            canViewHistory: r.userId === me.id || isAdmin(me),
            startLocked: permissions.startLocked,
          },
        ];
      }),
  }));

  const nowFraction = fractionOfRange(now, view.range);
  const nowPct = nowFraction >= 0 && nowFraction < 1 ? nowFraction * 100 : null;
  const pastPct = Math.min(Math.max(nowFraction, 0), 1) * 100;
  // 5 minutes of headroom, so the suggested start is not already "in the past" when submitted
  const suggestedStartLocal =
    ymd === today
      ? instantToColomboLocal(ceilToGrid(new Date(now.getTime() + 5 * 60_000)))
      : `${ymd}T09:00`;

  return (
    <div className="page">
      <AutoRefresh seconds={60} />
      <div className="page-head">
        <div className="section">
          <p className="mono muted">{ymd === today ? "Today" : "Selected day"}</p>
          <h1>{formatDayLabel(ymd)}</h1>
        </div>
        <DayNav ymd={ymd} today={today} />
      </div>

      <Timeline
        ymd={ymd}
        dayStartMs={view.range.start.getTime()}
        nowMs={now.getTime()}
        nowPct={nowPct}
        pastPct={pastPct}
        rows={rows}
        bookableResources={view.resources
          .filter((r) => r.isActive)
          .map((r) => ({ id: r.id, name: r.name }))}
        suggestedStartLocal={suggestedStartLocal}
      />

      <p className="muted">
        Click free time on a row, or use the Book button. Back-to-back bookings are allowed. Your
        own bookings have a green underline.
      </p>
    </div>
  );
}