import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <div className="empty">
        <h2>Nothing here</h2>
        <p className="muted">That page or record does not exist.</p>
        <Link className="btn btn--primary" href="/">Back to the board</Link>
      </div>
    </div>
  );
}