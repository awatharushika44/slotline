import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { ToastHost } from "@/components/toast-host";
import { getSessionUser } from "@/lib/auth/current-user";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Slotline", template: "%s · Slotline" },
  description: "See what is free, when, and who has it. Double booking is impossible by design.",
};

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="2" y="12" width="24" height="4" rx="2" fill="currentColor" opacity="0.25" />
      <rect x="6" y="12" width="11" height="4" rx="2" fill="currentColor" />
      <circle cx="21.5" cy="14" r="3" fill="var(--signal)" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getSessionUser();

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <ToastHost>
          <a href="#main" className="skip-link">Skip to content</a>
          <div className="shell">
            <header className="site-header">
              <Link href={me ? "/" : "/login"} className="brand">
                <BrandMark />
                Slotline
              </Link>
              {me && (
                <>
                  <nav className="nav" aria-label="Main">
                    <Link href="/">Now</Link>
                    <Link href="/timeline">Timeline</Link>
                    <Link href="/find">Find a slot</Link>
                    <Link href="/reservations">Reservations</Link>
                    <Link href="/resources">Resources</Link>
                    <Link href="/insights">Insights</Link>
                  </nav>
                  <div className="account">
                    <span>
                      {me.name} <span className="badge badge--muted">{me.role}</span>
                    </span>
                    <form action={logoutAction}>
                      <button className="btn btn--ghost btn--small">Sign out</button>
                    </form>
                  </div>
                </>
              )}
            </header>
            <main id="main">{children}</main>
          </div>
        </ToastHost>
      </body>
    </html>
  );
}