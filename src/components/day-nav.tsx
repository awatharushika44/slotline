import Link from "next/link";
import { addDaysYmd } from "@/lib/time/zone";

export function DayNav({ ymd, today }: { ymd: string; today: string }) {
  return (
    <nav className="day-nav" aria-label="Choose day">
      <Link className="btn btn--ghost btn--small" href={`/timeline?date=${addDaysYmd(ymd, -1)}`}>← Previous</Link>
      <Link className="btn btn--ghost btn--small" href="/timeline" aria-current={ymd === today ? "date" : undefined}>Today</Link>
      <Link className="btn btn--ghost btn--small" href={`/timeline?date=${addDaysYmd(ymd, 1)}`}>Next →</Link>
      <form method="get" action="/timeline">
        <label htmlFor="date" className="visually-hidden">Go to date</label>
        <input id="date" type="date" name="date" defaultValue={ymd} />
        <button className="btn btn--ghost btn--small">Go</button>
      </form>
    </nav>
  );
}