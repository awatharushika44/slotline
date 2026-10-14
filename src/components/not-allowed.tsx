export function NotAllowed({ what }: { what: string }) {
  return (
    <div className="empty" role="alert">
      <h2>Admins only</h2>
      <p className="muted">{what} Sign in as an admin to do this.</p>
    </div>
  );
}