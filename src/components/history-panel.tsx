"use client";

import { useState, useTransition } from "react";
import { getHistoryAction } from "@/app/reservations/actions";
import type { HistoryResult } from "@/lib/services/audit-service";

export function HistoryPanel({ reservationId }: { reservationId: string }) {
  const [result, setResult] = useState<HistoryResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!result) {
    return (
      <button
        type="button"
        className="btn btn--ghost btn--small"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await getHistoryAction(reservationId)))}
      >
        {pending ? "Loading…" : "Show history"}
      </button>
    );
  }
  if (!result.ok) return <p role="alert" className="error">⚠ {result.message}</p>;

  return (
    <section aria-label="Booking history">
      <h3>History</h3>
      <ol className="history">
        {result.items.map((item) => (
          <li key={item.id}>
            <span className="mono muted">{item.when}</span> · <strong>{item.who}</strong>
            {item.lines.map((line) => <div key={line}>{line}</div>)}
          </li>
        ))}
      </ol>
    </section>
  );
}