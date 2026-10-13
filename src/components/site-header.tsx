import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listActiveUsers } from "@/lib/db/user-repo";
import { UserSwitcher } from "@/components/user-switcher";

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect
        x="2"
        y="12"
        width="24"
        height="4"
        rx="2"
        fill="currentColor"
        opacity="0.25"
      />
      <rect
        x="6"
        y="12"
        width="11"
        height="4"
        rx="2"
        fill="currentColor"
      />
      <circle
        cx="21.5"
        cy="14"
        r="3"
        fill="var(--signal)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

async function HeaderContent() {
  const [me, people] = await Promise.all([
    getCurrentUser(),
    listActiveUsers(),
  ]);

  return (
    <>
      <Link href="/" className="brand">
        <BrandMark />
        Slotline
      </Link>

      <nav className="nav" aria-label="Main">
        <Link href="/">Now</Link>
        <Link href="/resources">Resources</Link>
        <Link href="/design-system">Design system</Link>
      </nav>

      <UserSwitcher users={people} currentId={me.id} />
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Suspense
        fallback={
          <div className="muted" aria-live="polite">
            Loading Slotline…
          </div>
        }
      >
        <HeaderContent />
      </Suspense>
    </header>
  );
}