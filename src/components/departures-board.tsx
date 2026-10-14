import Link from "next/link";
import type { BoardRow } from "@/lib/services/availability-service";
import { formatDuration, formatTime } from "@/lib/time/format";
import { Flap } from "./flap";

export function DeparturesBoard({ rows, now }: { rows: BoardRow[]; now: Date }) {
  if (rows.length === 0) {
    return (
      <div className="empty">
        <h3>No resources yet</h3>
        <p className="muted">Add a resource first, then its status shows up here.</p>
        <Link className="btn btn--primary" href="/resources">Go to resources</Link>
      </div>
    );
  }

  return (
    <div className="board" role="list" aria-label="Status of every resource right now">
      {rows.map(({ resource, status }) => {
        const free = status.state === "free";
        const detail =
          status.state === "busy"
            ? `until ${formatTime(status.until)} · ${status.holderName}`
            : status.until
              ? `for ${formatDuration(status.until.getTime() - now.getTime())}`
              : "all clear for 24h";
        return (
          <div className="board-row" role="listitem" key={resource.id}>
            <span>{resource.name}</span>
            <span className={`board-status ${free ? "board-status--free" : "board-status--busy"}`}>
              <Flap value={free ? "● Free" : "■ Busy"} />
            </span>
            {/* no aria-live here: the minute counter would make screen readers chatter */}
            <span className="board-detail"><span key={detail} className="flap">{detail}</span></span>
          </div>
        );
      })}
    </div>
  );
}