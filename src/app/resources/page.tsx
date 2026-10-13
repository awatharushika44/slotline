
import Link from "next/link";
import { Suspense } from "react";
import { setResourceActiveAction } from "@/app/resources/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/domain/actor";
import { CATEGORY_LABELS } from "@/lib/domain/resource-categories";
import { listResources } from "@/lib/services/resource-service";

export const metadata = { title: "Resources" };

async function ResourcesContent({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const includeArchived = archived === "1";

  const [me, rows] = await Promise.all([
    getCurrentUser(),
    listResources({ includeArchived }),
  ]);

  const admin = isAdmin(me);

  return (
    <div className="page">
      <div className="page-head">
        <div className="section">
          <h1>Resources</h1>
          <p className="muted">
            Archiving stops new bookings. History and existing bookings stay.
          </p>
        </div>

        <div className="day-nav">
          <Link
            className="btn btn--ghost btn--small"
            href={includeArchived ? "/resources" : "/resources?archived=1"}
          >
            {includeArchived ? "Hide archived" : "Show archived"}
          </Link>

          {admin && (
            <Link className="btn btn--primary" href="/resources/new">
              New resource
            </Link>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <h3>No resources yet</h3>
          <p className="muted">
            {admin
              ? "Create the first one to start taking bookings."
              : "An admin needs to add resources first."}
          </p>
        </div>
      ) : (
        <div className="cards">
          {rows.map((r) => (
            <article
              key={r.id}
              className={`card resource-card ${
                r.isActive ? "" : "resource-card--archived"
              }`}
            >
              <div className="resource-meta">
                <span className="badge badge--busy">
                  {CATEGORY_LABELS[r.category]}
                </span>
                {!r.isActive && (
                  <span className="badge badge--muted">Archived</span>
                )}
              </div>

              <h3>{r.name}</h3>
              <p className="muted">
                Capacity {r.capacity}
                {r.location ? ` · ${r.location}` : ""}
              </p>

              {r.description && <p>{r.description}</p>}

              {admin && (
                <div className="form-actions">
                  <Link
                    className="btn btn--ghost btn--small"
                    href={`/resources/${r.id}/edit`}
                  >
                    Edit
                  </Link>

                  <form action={setResourceActiveAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={r.isActive ? "false" : "true"}
                    />
                    <button className="btn btn--ghost btn--small">
                      {r.isActive ? "Archive" : "Restore"}
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="page">
          <p className="muted" role="status">
            Loading resources…
          </p>
        </div>
      }
    >
      <ResourcesContent searchParams={searchParams} />
    </Suspense>
  );
}
