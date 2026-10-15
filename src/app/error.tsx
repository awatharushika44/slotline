"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <div className="empty" role="alert">
        <h2>Something went wrong</h2>
        <p className="muted">It is not your fault. Try again, and if it keeps happening, tell an admin.</p>
        {error.digest && <p className="mono muted">Reference: {error.digest}</p>}
        <button className="btn btn--primary" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}