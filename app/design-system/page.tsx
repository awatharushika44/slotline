import type { Metadata } from "next";
import { FlapDemo } from "@/components/flap-demo";

export const metadata: Metadata = { title: "Design system" };

const colors = [
  { name: "paper", token: "--paper", use: "Page background" },
  { name: "paper-raised", token: "--paper-raised", use: "Cards, inputs" },
  { name: "ink", token: "--ink", use: "Text, board, primary button" },
  { name: "ink-soft", token: "--ink-soft", use: "Secondary text" },
  { name: "ink-block", token: "--ink-block", use: "Booking blocks" },
  { name: "signal", token: "--signal", use: "Free now accent" },
  { name: "signal-text", token: "--signal-text", use: "Free text on paper" },
  { name: "danger", token: "--danger", use: "Errors, now line" },
];

const spaces = ["--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6"];

export default function DesignSystemPage() {
  return (
    <div className="page">
      <header className="section">
        <p className="mono muted">Design system</p>
        <h1>Quiet when free. Solid when taken.</h1>
        <p className="muted" style={{ maxWidth: "38rem" }}>
          Every screen in Slotline is built from these tokens. Free time is calm negative space.
          Bookings are solid ink. Meaning never depends on color alone.
        </p>
      </header>

      <section className="section" aria-labelledby="colors">
        <h2 id="colors">Color</h2>
        <div className="grid-auto">
          {colors.map((c) => (
            <div className="swatch" key={c.token}>
              <div className="swatch-color" style={{ background: `var(${c.token})` }} />
              <div className="swatch-label">
                <strong>{c.name}</strong>
                <div className="muted mono">{c.token}</div>
                <div className="muted">{c.use}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="type">
        <h2 id="type">Type</h2>
        <div className="card" style={{ display: "grid", gap: "var(--space-3)" }}>
          <h1>Bricolage Grotesque: headings</h1>
          <p>Geist: calm, readable interface text for forms, labels and paragraphs.</p>
          <p className="mono">Geist Mono: 09:00 – 10:15 · 14:30 · 2h 15m (tabular numbers)</p>
        </div>
      </section>

      <section className="section" aria-labelledby="space">
        <h2 id="space">Spacing scale</h2>
        <div className="card" style={{ display: "grid", gap: "var(--space-2)" }}>
          {spaces.map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span className="mono muted" style={{ width: "6rem" }}>{s}</span>
              <span style={{ height: "0.75rem", width: `var(${s})`, background: "var(--ink-block)", borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="buttons">
        <h2 id="buttons">Buttons and badges</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          <button className="btn btn--primary">Book this slot</button>
          <button className="btn btn--ghost">Cancel</button>
          <button className="btn btn--danger">Cancel booking</button>
          <button className="btn btn--primary" disabled>Disabled</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <span className="badge badge--free">● Free</span>
          <span className="badge badge--busy">■ Busy</span>
          <span className="badge badge--cancelled">✕ Cancelled</span>
          <span className="badge badge--error">⚠ Conflict</span>
        </div>
      </section>

      <section className="section" aria-labelledby="forms">
        <h2 id="forms">Form fields</h2>
        <div className="card" style={{ display: "grid", gap: "var(--space-4)", maxWidth: "26rem" }}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" placeholder="Weekly planning" aria-describedby="title-hint" />
            <span id="title-hint" className="hint">Shown to everyone who sees the booking.</span>
          </div>
          <div className="field">
            <label htmlFor="end">End time</label>
            <input id="end" defaultValue="09:00" aria-invalid="true" aria-describedby="end-error" />
            <span id="end-error" className="error">⚠ End time must be after the start time.</span>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="board">
        <h2 id="board">Departures board</h2>
        <div className="board">
          <div className="board-row">
            <span>Boardroom A</span>
            <span className="board-status board-status--free">● Free</span>
            <span className="board-detail">for 2h 15m</span>
          </div>
          <div className="board-row">
            <span>Meeting Room B</span>
            <span className="board-status board-status--busy">■ Busy</span>
            <span className="board-detail">until 14:30 · Anna</span>
          </div>
          <div className="board-row">
            <span>Company Van</span>
            <span className="board-status board-status--free">● Free</span>
            <span className="board-detail">until 17:00</span>
          </div>
        </div>
        <p className="muted">Try the flip animation (it respects reduced-motion settings):</p>
        <FlapDemo />
      </section>

      <section className="section" aria-labelledby="ribbon">
        <h2 id="ribbon">Ribbon timeline</h2>
        <div className="ribbon" role="img" aria-label="Day timeline: booked 09:00 to 10:00 and 10:00 to 11:30, cancelled 14:00 to 15:00, now is 12:15">
          <div className="tl-block" style={{ left: "10%", width: "10%" }}>AF</div>
          <div className="tl-block" style={{ left: "20%", width: "15%" }}>KS</div>
          <div className="tl-block tl-block--cancelled" style={{ left: "60%", width: "10%" }}>DJ</div>
          <div className="now-line" style={{ left: "42.5%" }} />
        </div>
        <div className="ribbon-scale mono" aria-hidden="true">
          <span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span>
        </div>
        <p className="muted">Back-to-back blocks touch without a gap: the half-open rule, drawn.</p>
      </section>

      <section className="section" aria-labelledby="states">
        <h2 id="states">States</h2>
        <div className="card" style={{ display: "grid", gap: "var(--space-3)" }} aria-busy="true" aria-label="Loading example">
          <div className="skeleton" style={{ width: "60%" }} />
          <div className="skeleton" style={{ width: "85%" }} />
          <div className="skeleton" style={{ width: "40%" }} />
        </div>
        <div className="empty">
          <svg width="96" height="40" viewBox="0 0 96 40" aria-hidden="true">
            <rect x="2" y="14" width="26" height="12" rx="4" fill="none" stroke="currentColor" strokeDasharray="4 3" />
            <rect x="34" y="14" width="26" height="12" rx="4" fill="none" stroke="currentColor" strokeDasharray="4 3" />
            <rect x="66" y="14" width="26" height="12" rx="4" fill="var(--signal)" stroke="currentColor" />
          </svg>
          <h3>Nothing booked yet</h3>
          <p className="muted">The whole day is free. Pick a slot to make the first booking.</p>
          <button className="btn btn--primary">Find me a slot</button>
        </div>
        <div className="toast" role="status">
          <span>Booking cancelled.</span>
          <button>Undo</button>
        </div>
      </section>
    </div>
  );
}