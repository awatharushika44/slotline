import Link from "next/link";
import { SlotBookForm } from "@/components/slot-book-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { CATEGORY_LABELS, RESOURCE_CATEGORIES } from "@/lib/domain/resource-categories";
import { findSlots } from "@/lib/services/slot-search-service";
import { formatDayLabel, formatDuration, formatRange } from "@/lib/time/format";
import { ymdInColombo } from "@/lib/time/zone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Find a slot" };

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240, 480] as const;

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ minutes?: string; category?: string }>;
}) {
  await getCurrentUser();
  const sp = await searchParams;
  const minutes = DURATIONS.find((d) => String(d) === sp.minutes) ?? 60;
  const category = RESOURCE_CATEGORIES.find((c) => c === sp.category);
  const slots = await findSlots({ durationMinutes: minutes, category, now: new Date() });

  return (
    <div className="page">
      <header className="section">
        <h1>Find me a slot</h1>
        <p className="muted">Tell us how long you need. We show the earliest free options in working hours (08:00–18:00) over the next 3 days.</p>
      </header>

      <form method="get" className="filters" aria-label="Slot search">
        <div className="field">
          <label htmlFor="minutes">How long?</label>
          <select id="minutes" name="minutes" defaultValue={String(minutes)}>
            {DURATIONS.map((d) => <option key={d} value={d}>{formatDuration(d * 60_000)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="category">What kind?</label>
          <select id="category" name="category" defaultValue={category ?? ""}>
            <option value="">Anything</option>
            {RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
        <button className="btn btn--primary">Find slots</button>
      </form>

      {slots.length === 0 ? (
        <div className="empty">
          <h3>Nothing free that long</h3>
          <p className="muted">No {formatDuration(minutes * 60_000)} slot in the next 3 working days. Try a shorter time or another category.</p>
          <Link className="btn btn--ghost" href="/timeline">Open the timeline</Link>
        </div>
      ) : (
        <ul className="slot-list">
          {slots.map((s) => (
            <li className="slot-card" key={`${s.resourceId}-${s.start.toISOString()}`}>
              <div>
                <p className="mono muted">{formatDayLabel(ymdInColombo(s.start))}</p>
                <h3>{s.resourceName}</h3>
                <p className="mono">{formatRange(s.start, s.end)} · {formatDuration(minutes * 60_000)}</p>
              </div>
              <SlotBookForm resourceId={s.resourceId} startIso={s.start.toISOString()} endIso={s.end.toISOString()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}