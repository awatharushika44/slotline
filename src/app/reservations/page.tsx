import Link from "next/link";
import { CancelReservationButton } from "@/components/cancel-reservation-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/domain/actor";
import { getReservationPermissions } from "@/lib/domain/reservation-policy";
import { getReservationList } from "@/lib/services/availability-service";
import { formatDayLabel, formatRange } from "@/lib/time/format";
import { ymdInColombo } from "@/lib/time/zone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reservations" };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const mode = show === "past" ? "past" : "upcoming";
  const now = new Date();
  const me = await getCurrentUser();
  const rows = await getReservationList(me, mode, now);

  return (
    <div className="page">
      <div className="page-head">
        <div className="section">
          <h1>{isAdmin(me) ? "All reservations" : "My reservations"}</h1>
          <p className="muted">The list view: same data as the timeline, easier on small screens.</p>
        </div>
        <nav className="day-nav" aria-label="Which reservations">
          <Link className="btn btn--ghost btn--small" href="/reservations" aria-current={mode === "upcoming" ? "page" : undefined}>Upcoming</Link>
          <Link className="btn btn--ghost btn--small" href="/reservations?show=past" aria-current={mode === "past" ? "page" : undefined}>Past</Link>
        </nav>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <h3>Nothing here</h3>
          <p className="muted">{mode === "upcoming" ? "No upcoming reservations. Book something on the timeline." : "No past reservations yet."}</p>
          <Link className="btn btn--primary" href="/timeline">Open timeline</Link>
        </div>
      ) : (
        <ul className="res-list">
          {rows.map((r) => {
            const cancelled = r.status === "cancelled";
            const permissions = getReservationPermissions(
              { ownerId: r.userId, status: r.status, range: { start: r.start, end: r.end } },
              me,
              now,
            );
            return (
              <li key={r.id} className={`res-row ${cancelled ? "res-row--cancelled" : ""}`}>
                <div>
                  <p className="mono">{formatDayLabel(ymdInColombo(r.start))} · {formatRange(r.start, r.end)}</p>
                  <h3 className="res-title">{r.title}</h3>
                  <p className="muted">{r.resourceName} · {r.holderName}</p>
                </div>
                <div className="row-actions">
                  <span className={`badge ${cancelled ? "badge--cancelled" : "badge--busy"}`}>{cancelled ? "✕ Cancelled" : "■ Booked"}</span>
                  <Link className="btn btn--ghost btn--small" href={`/timeline?date=${ymdInColombo(r.start)}`}>On timeline</Link>
                  {permissions.canCancel && <CancelReservationButton reservationId={r.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}