
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NotAllowed } from "@/components/not-allowed";
import { ResourceForm } from "@/components/resource-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/domain/actor";
import { getResource } from "@/lib/services/resource-service";
import { isUuid } from "@/lib/validation/ids";

export const metadata = { title: "Edit resource" };

async function EditResourceContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) notFound();

  const [me, resource] = await Promise.all([
    getCurrentUser(),
    getResource(id),
  ]);

  if (!resource) notFound();

  return (
    <div className="page">
      <h1>Edit {resource.name}</h1>

      {isAdmin(me) ? (
        <ResourceForm resource={resource} />
      ) : (
        <NotAllowed what="Only admins can edit resources." />
      )}
    </div>
  );
}

export default function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="page">
          <p className="muted" role="status">
            Loading resource…
          </p>
        </div>
      }
    >
      <EditResourceContent params={params} />
    </Suspense>
  );
}

