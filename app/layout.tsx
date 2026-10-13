import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <div className="shell">
          <header className="site-header">
            <Link href="/" className="brand">
              <BrandMark />
              Slotline
            </Link>
            <nav className="nav" aria-label="Main">
              <Link href="/">Now</Link>
              <Link href="/design-system">Design system</Link>
            </nav>
          </header>
          <main id="main">{children}</main>
        </div>
      </body>
    </html>
  );
}