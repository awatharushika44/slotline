"use client";

import { useActionState, useRef } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Field, fieldProps } from "./field";

interface Demo {
  accounts: { email: string; label: string }[];
  password: string;
}

export function LoginForm({ demo }: { demo: Demo | null }) {
  const [state, formAction, pending] = useActionState(loginAction, {} as LoginState);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function signInAs(email: string, password: string) {
    if (!emailRef.current || !passwordRef.current) return;
    emailRef.current.value = email;
    passwordRef.current.value = password;
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="card form-card">
        {state.message && <p role="alert" className="error">⚠ {state.message}</p>}
        <Field name="email" label="Email">
          <input {...fieldProps("email")} ref={emailRef} type="email" autoComplete="username" defaultValue={state.email} required />
        </Field>
        <Field name="password" label="Password">
          <input {...fieldProps("password")} ref={passwordRef} type="password" autoComplete="current-password" required />
        </Field>
        <button className="btn btn--primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>

      {demo && (
        <section className="demo-logins" aria-label="Demo accounts">
          <p className="muted">Demo accounts for reviewers (password <span className="mono">{demo.password}</span>):</p>
          {demo.accounts.map((a) => (
            <button key={a.email} type="button" className="btn btn--ghost" onClick={() => signInAs(a.email, demo.password)}>
              Sign in as {a.label}
            </button>
          ))}
        </section>
      )}
    </>
  );
}