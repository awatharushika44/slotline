export function NotAllowed({ what }: { what: string }) {
  return (
    <div className="empty" role="alert">
      <h2>Admins only</h2>
      <p className="muted">{what} Use “Acting as” in the header to switch to an admin.</p>
    </div>
  );
}