"use client";

import { useActionState, useRef } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Field, fieldProps } from "./field";

interface Demo {
  accounts: { email: string; name: string; role: string }[];
  password: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
      <form ref={formRef} action={formAction} className="auth-form">
        {state.message && (
          <p role="alert" className="error auth-error">
            ⚠ {state.message}
          </p>
        )}
        <Field name="email" label="Email">
          <input
            {...fieldProps("email")}
            ref={emailRef}
            type="email"
            autoComplete="username"
            defaultValue={state.email}
            placeholder="you@company.com"
            required
          />
        </Field>
        <Field name="password" label="Password">
          <input
            {...fieldProps("password")}
            ref={passwordRef}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </Field>
        <button className="btn btn--primary auth-submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {demo && (
        <section className="auth-demo" aria-label="Demo accounts">
          <p className="auth-divider">
            <span>or try a demo account</span>
          </p>
          <div className="auth-chips">
            {demo.accounts.map((a) => (
              <button
                key={a.email}
                type="button"
                className="demo-chip"
                disabled={pending}
                onClick={() => signInAs(a.email, demo.password)}
              >
                <span className="demo-avatar" aria-hidden="true">
                  {initials(a.name)}
                </span>
                <span className="demo-text">
                  <strong>{a.name}</strong>
                  <span className="muted">{a.role}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="muted auth-pass">
            Password for all demos: <span className="mono">{demo.password}</span>
          </p>
        </section>
      )}
    </>
  );
}