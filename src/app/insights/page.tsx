import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRecentActivity } from "@/lib/services/audit-service";
import { getInsights } from "@/lib/services/insights-service";
import { formatDayLabel } from "@/lib/time/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights" };

const RANGES = [7, 30, 90] as const;
const pad = (n: number) => String(n).padStart(2, "0");

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const me = await getCurrentUser();
  const { days: daysParam } = await searchParams;
  const days = RANGES.find((d) => String(d) === daysParam) ?? 30;
  const [data, activity] = await Promise.all([getInsights(days, new Date()), getRecentActivity(me)]);

  const total = data.totals.active + data.totals.cancelled;
  const cancelRate = total === 0 ? 0 : Math.round((data.totals.cancelled / total) * 100);

  return (
    <div className="page">
      <div className="page-head">
        <div className="section">
          <h1>Usage insights</h1>
          <p className="muted">
            {formatDayLabel(data.fromYmd)} to {formatDayLabel(data.today)}. Utilization counts working hours (08:00–18:00) only.
          </p>
        </div>
        <nav className="day-nav" aria-label="Period">
          {RANGES.map((d) => (
            <Link key={d} className="btn btn--ghost btn--small" href={`/insights?days=${d}`} aria-current={d === days ? "page" : undefined}>
              {d} days
            </Link>
          ))}
        </nav>
      </div>

      <section className="stats" aria-label="Summary">
        <div className="card stat"><strong>{data.totals.active}</strong><span className="muted">active bookings</span></div>
        <div className="card stat"><strong>{Math.round(data.totalBookedHours)} h</strong><span className="muted">booked in working hours</span></div>
        <div className="card stat"><strong>{cancelRate}%</strong><span className="muted">cancelled ({data.totals.cancelled} of {total})</span></div>
      </section>

      <section className="section" aria-labelledby="util">
        <h2 id="util">Utilization per resource</h2>
        {data.utilization.length === 0 ? (
          <p className="muted">No active resources.</p>
        ) : (
          <ul className="bar-list">
            {data.utilization.map((r) => (
              <li className="bar-row" key={r.resourceId}>
                <span>{r.name}</span>
                <div className="bar" role="img" aria-label={`${r.name}: ${r.percent}% utilized`}>
                  <span style={{ width: `${Math.min(r.percent, 100)}%` }} />
                </div>
                <span className="mono">{r.percent}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="heat">
        <h2 id="heat">Busiest hours</h2>
        <p className="muted">Number of bookings touching each hour (Colombo time). Darker means busier, and the number is printed in every cell.</p>
        <div className="heat-wrap">
          <table className="heat">
            <caption className="visually-hidden">Bookings by weekday and hour</caption>
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Day</span></th>
                {data.heat.hours.map((h) => <th scope="col" key={h} className="mono">{pad(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.heat.rows.map((row) => (
                <tr key={row.isoDow}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell) => (
                    <td key={cell.hour} data-level={cell.level} title={`${row.label} ${pad(cell.hour)}:00 · ${cell.bookings} bookings`}>
                      {cell.bookings || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" aria-labelledby="top">
        <h2 id="top">Top users</h2>
        <table className="table">
          <thead><tr><th scope="col">Person</th><th scope="col">Bookings</th><th scope="col">Hours</th></tr></thead>
          <tbody>
            {data.topUsers.map((u) => (
              <tr key={u.name}><td>{u.name}</td><td className="mono">{u.bookings}</td><td className="mono">{u.hours}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {activity.length > 0 && (
        <section className="section" aria-labelledby="activity">
          <h2 id="activity">Recent activity (admins)</h2>
          <table className="table">
            <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Booking</th><th scope="col">What happened</th></tr></thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.when}</td>
                  <td>{a.who}</td>
                  <td>{a.title} · <span className="muted">{a.resourceName}</span></td>
                  <td>{a.lines.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}