
import { Suspense } from "react";
import { NotAllowed } from "@/components/not-allowed";
import { ResourceForm } from "@/components/resource-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/domain/actor";

export const metadata = { title: "New resource" };

async function NewResourceContent() {
  const me = await getCurrentUser();

  return (
    <div className="page">
      <h1>New resource</h1>
      {isAdmin(me) ? (
        <ResourceForm />
      ) : (
        <NotAllowed what="Only admins can create resources." />
      )}
    </div>
  );
}

export default function NewResourcePage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <p className="muted" role="status">
            Loading resource form…
          </p>
        </div>
      }
    >
      <NewResourceContent />
    </Suspense>
  );
}
