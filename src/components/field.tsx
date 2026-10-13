import type { ReactNode } from "react";

/** aria wiring for one input: id, name, invalid state, and the hint/error it is described by. */
export function fieldProps(name: string, error?: string, hasHint = false) {
  const describedBy = [hasHint ? `${name}-hint` : null, error ? `${name}-error` : null]
    .filter(Boolean)
    .join(" ");
  return {
    id: name,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}

interface FieldProps {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ name, label, error, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && <span id={`${name}-hint`} className="hint">{hint}</span>}
      {error && <span id={`${name}-error`} className="error">⚠ {error}</span>}
    </div>
  );
}