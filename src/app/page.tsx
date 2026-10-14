import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { DeparturesBoard } from "@/components/departures-board";
import { getBoard } from "@/lib/services/availability-service";
import { formatDayLabel, formatTime } from "@/lib/time/format";
import { todayInColombo } from "@/lib/time/zone";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const rows = await getBoard(now);
  const freeCount = rows.filter((r) => r.status.state === "free").length;

  return (
    <div className="page">
      <AutoRefresh seconds={30} />
      <header className="section">
        <p className="mono muted">{formatDayLabel(todayInColombo(now))} · {formatTime(now)}</p>
        <h1>What is free right now?</h1>
        <p>
          <span className="badge badge--free">● {freeCount} free</span>{" "}
          <span className="badge badge--busy">■ {rows.length - freeCount} busy</span>
        </p>
      </header>
      <DeparturesBoard rows={rows} now={now} />
      <p><Link className="btn btn--primary" href="/timeline">Open today’s timeline</Link></p>
    </div>
  );
}