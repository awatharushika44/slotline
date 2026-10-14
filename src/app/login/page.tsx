import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth/current-user";
import { DEMO_PASSWORD } from "@/lib/auth/demo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

const DEMO_ACCOUNTS = [
  { email: "amaya@slotline.test", label: "Amaya (admin)" },
  { email: "kasun@slotline.test", label: "Kasun (member)" },
  { email: "dilini@slotline.test", label: "Dilini (member)" },
];

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  const demo = process.env.SHOW_DEMO_ACCOUNTS === "true" ? { accounts: DEMO_ACCOUNTS, password: DEMO_PASSWORD } : null;

  return (
    <div className="page">
      <div className="login">
        <header className="section">
          <h1>Sign in to Slotline</h1>
          <p className="muted">See what is free, when, and who has it.</p>
        </header>
        <LoginForm demo={demo} />
      </div>
    </div>
  );
}