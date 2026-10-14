"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { snapMinutes } from "@/lib/domain/timeline-layout";
import { addMinutesToLocal } from "@/lib/time/local";
import { ReservationDialog, type DialogState } from "./reservation-dialog";
import type { TimelineRow } from "./timeline-types";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DAY_MINUTES = 24 * 60;
const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  ymd: string;
  dayStartMs: number;
  nowMs: number;
  nowPct: number | null;
  pastPct: number;
  rows: TimelineRow[];
  bookableResources: { id: string; name: string }[];
  suggestedStartLocal: string;
}

export function Timeline({ ymd, dayStartMs, nowMs, nowPct, pastPct, rows, bookableResources, suggestedStartLocal }: Props) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialNowPct = useRef(nowPct); // read once, so a refresh never yanks the scroll position

  useEffect(() => {
    const scroller = scrollRef.current;
    const ribbon = scroller?.querySelector<HTMLElement>(".ribbon");
    if (!scroller || !ribbon) return;
    const nowPctValue = initialNowPct.current;
    const targetHour = nowPctValue === null ? 7 : Math.max(0, Math.floor((nowPctValue / 100) * 24) - 2);
    scroller.scrollLeft = (ribbon.getBoundingClientRect().width / 24) * targetHour;
  }, [ymd]);

  function openCreate(resourceId: string, startsAtLocal: string) {
    setDialog({ kind: "create", resourceId, startsAtLocal, endsAtLocal: addMinutesToLocal(startsAtLocal, 60) });
  }

  function onRibbonClick(event: MouseEvent<HTMLDivElement>, row: TimelineRow) {
    if (row.archived) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = snapMinutes((event.clientX - rect.left) / rect.width, DAY_MINUTES);
    if (dayStartMs + minutes * 60_000 < nowMs) return; // the past cannot be booked
    openCreate(row.id, `${ymd}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }

  return (
    <>
      <div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={bookableResources.length === 0}
          onClick={() => bookableResources[0] && openCreate(bookableResources[0].id, suggestedStartLocal)}
        >
          + New booking
        </button>
      </div>

      <div className="tl-scroll" ref={scrollRef}>
        <div className="tl">
          <div className="tl-head">
            <div className="tl-label" />
            <div className="tl-hours mono" aria-hidden="true">
              {HOURS.map((h) => <span key={h}>{pad(h)}:00</span>)}
            </div>
          </div>

          {rows.map((row) => (
            <div className="tl-row" key={row.id}>
              <div className="tl-label">
                <strong>{row.name}</strong>
                <span className="muted">{row.archived ? "Archived" : row.categoryLabel}</span>
                {!row.archived && (
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => openCreate(row.id, suggestedStartLocal)}>
                    Book
                  </button>
                )}
              </div>

              {/* mouse shortcut only: keyboard users have the Book button in the label */}
              <div className="ribbon" role="presentation" onClick={(event) => onRibbonClick(event, row)}>
                <div className="tl-past" style={{ width: `${pastPct}%` }} />
                {row.blocks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`tl-block ${b.mine ? "tl-block--mine" : ""}`}
                    style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
                    aria-label={`${b.title}, ${b.holderName}${b.mine ? " (you)" : ""}, ${b.timeLabel}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDialog({ kind: "details", block: b, resourceName: row.name });
                    }}
                  >
                    <span className="tl-initials">{b.initials}</span>
                    <span>{b.title}</span>
                  </button>
                ))}
                {nowPct !== null && <div className="now-line" style={{ left: `${nowPct}%` }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ReservationDialog state={dialog} onChange={setDialog} bookableResources={bookableResources} />
    </>
  );
}