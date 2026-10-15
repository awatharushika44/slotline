import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth/current-user";
import { DEMO_PASSWORD } from "@/lib/auth/demo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

const DEMO_ACCOUNTS = [
  { email: "amaya@slotline.test", name: "Amaya Fernando", role: "admin" },
  { email: "kasun@slotline.test", name: "Kasun Silva", role: "member" },
  { email: "dilini@slotline.test", name: "Dilini Jayawardena", role: "member" },
];

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  const demo =
    process.env.SHOW_DEMO_ACCOUNTS === "true"
      ? { accounts: DEMO_ACCOUNTS, password: DEMO_PASSWORD }
      : null;

  return (
    <div className="auth">
      <div className="auth-orbs" aria-hidden="true">
        <span className="orb orb--a" />
        <span className="orb orb--b" />
        <span className="orb orb--c" />
      </div>

      <section className="auth-card" aria-labelledby="login-title">
        <header className="auth-head">
          <p className="auth-kicker mono">
            <span className="live">LIVE</span> · Slotline
          </p>
          <h1 id="login-title">Welcome back</h1>
          <p className="muted">See what is free, when, and who has it.</p>
        </header>

        {/* decorative mini timeline: slots filling up */}
        <div className="auth-ribbon" aria-hidden="true">
          <span className="auth-slot auth-slot--1" />
          <span className="auth-slot auth-slot--2" />
          <span className="auth-slot auth-slot--3" />
          <span className="auth-now" />
        </div>

        <LoginForm demo={demo} />

        <p className="auth-foot muted">Double booking is impossible by design.</p>
      </section>
    </div>
  );
}