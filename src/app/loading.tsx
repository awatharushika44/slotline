export default function Loading() {
  return (
    <div className="page" aria-busy="true">
      <span className="visually-hidden" role="status">Loading…</span>
      <div className="skeleton" style={{ height: "2.5rem", width: "45%" }} />
      <div className="card" style={{ display: "grid", gap: "var(--space-3)" }}>
        <div className="skeleton" style={{ width: "70%" }} />
        <div className="skeleton" style={{ width: "90%" }} />
        <div className="skeleton" style={{ width: "55%" }} />
      </div>
    </div>
  );
}