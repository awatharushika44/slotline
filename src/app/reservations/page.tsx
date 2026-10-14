import Link from "next/link";
import { CancelReservationButton } from "@/components/cancel-reservation-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listActiveUsers } from "@/lib/db/user-repo";
import { isAdmin } from "@/lib/domain/actor";
import { getReservationPermissions } from "@/lib/domain/reservation-policy";
import { getReservationList } from "@/lib/services/availability-service";
import { listResources } from "@/lib/services/resource-service";
import { formatDayLabel, formatRange } from "@/lib/time/format";
import { ymdInColombo } from "@/lib/time/zone";
import { isUuid } from "@/lib/validation/ids";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reservations" };

type Params = {
  show?: string;
  q?: string;
  resource?: string;
  status?: string;
  person?: string;
  page?: string;
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const me = await getCurrentUser();
  const admin = isAdmin(me);
  const sp = await searchParams;

  const mode = sp.show === "past" ? "past" : "upcoming";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const status = sp.status === "active" || sp.status === "cancelled" ? sp.status : undefined;
  const resourceId = sp.resource && isUuid(sp.resource) ? sp.resource : undefined;
  const personId = admin && sp.person && isUuid(sp.person) ? sp.person : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const now = new Date();

  const [{ rows, hasNext }, allResources, people] = await Promise.all([
    getReservationList(me, { mode, page, status, resourceId, userId: personId, search: q }, now),
    listResources({ includeArchived: true }),
    admin ? listActiveUsers() : Promise.resolve([]),
  ]);

  const current: Record<string, string | undefined> = {
    show: mode === "past" ? "past" : undefined,
    q,
    resource: resourceId,
    status,
    person: personId,
  };
  const href = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...current, ...extra })) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `/reservations?${query}` : "/reservations";
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="section">
          <h1>{admin ? "All reservations" : "My reservations"}</h1>
          <p className="muted">The list view: same data as the timeline, easier on small screens.</p>
        </div>
        <nav className="day-nav" aria-label="Which reservations">
          <Link
            className="btn btn--ghost btn--small"
            href="/reservations"
            aria-current={mode === "upcoming" ? "page" : undefined}
          >
            Upcoming
          </Link>
          <Link
            className="btn btn--ghost btn--small"
            href="/reservations?show=past"
            aria-current={mode === "past" ? "page" : undefined}
          >
            Past
          </Link>
        </nav>
      </div>

      <form method="get" action="/reservations" className="filters" aria-label="Filter reservations">
        {mode === "past" && <input type="hidden" name="show" value="past" />}
        <div className="field">
          <label htmlFor="q">Title contains</label>
          <input id="q" name="q" defaultValue={q} maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="resource">Resource</label>
          <select id="resource" name="resource" defaultValue={resourceId ?? ""}>
            <option value="">All</option>
            {allResources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">Any</option>
            <option value="active">Booked</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {admin && (
          <div className="field">
            <label htmlFor="person">Person</label>
            <select id="person" name="person" defaultValue={personId ?? ""}>
              <option value="">Everyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button className="btn btn--primary">Apply</button>
        <Link
          className="btn btn--ghost"
          href={mode === "past" ? "/reservations?show=past" : "/reservations"}
        >
          Clear
        </Link>
      </form>

      {rows.length === 0 ? (
        <div className="empty">
          <h3>Nothing here</h3>
          <p className="muted">
            No reservations match. Clear the filters or book something on the timeline.
          </p>
          <Link className="btn btn--primary" href="/timeline">
            Open timeline
          </Link>
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
                  <p className="mono">
                    {formatDayLabel(ymdInColombo(r.start))} · {formatRange(r.start, r.end)}
                  </p>
                  <h3 className="res-title">{r.title}</h3>
                  <p className="muted">
                    {r.resourceName} · {r.holderName}
                  </p>
                </div>
                <div className="row-actions">
                  <span className={`badge ${cancelled ? "badge--cancelled" : "badge--busy"}`}>
                    {cancelled ? "✕ Cancelled" : "■ Booked"}
                  </span>
                  <Link
                    className="btn btn--ghost btn--small"
                    href={`/timeline?date=${ymdInColombo(r.start)}`}
                  >
                    On timeline
                  </Link>
                  {permissions.canCancel && <CancelReservationButton reservationId={r.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(page > 1 || hasNext) && (
        <nav className="pager" aria-label="Pages">
          {page > 1 && (
            <Link className="btn btn--ghost btn--small" href={href({ page: String(page - 1) })}>
              ← Newer
            </Link>
          )}
          <span className="muted">Page {page}</span>
          {hasNext && (
            <Link className="btn btn--ghost btn--small" href={href({ page: String(page + 1) })}>
              Older →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}