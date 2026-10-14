"use client";

import { useRef, useState, useTransition } from "react";
import { saveReservationAction } from "@/app/reservations/actions";
import type { SaveResult, SuggestionDto } from "@/lib/reservation-dto";
import { Field, fieldProps } from "./field";
import { useToast } from "./toast-host";

export interface FormInitial {
  reservationId?: string;
  resourceId: string;
  title: string;
  notes: string;
  startsAtLocal: string;
  endsAtLocal: string;
  startLocked?: boolean;
}

interface Props {
  mode: "create" | "edit";
  resources: { id: string; name: string }[];
  resourceName?: string;
  initial: FormInitial;
  onSuccess: () => void;
}

export function ReservationForm({ mode, resources, resourceName, initial, onSuccess }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);
  const showToast = useToast();

  const errors: Record<string, string[]> = result?.status === "invalid" ? result.fieldErrors : {};
  const suggestions =
    result?.status === "conflict"
      ? result.suggestions.filter((s) => mode === "create" || s.kind === "next-free")
      : [];

  function submit(chosen?: SuggestionDto) {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    if (chosen) {
      data.set("slotResourceId", chosen.resourceId);
      data.set("slotStart", chosen.startIso);
      data.set("slotEnd", chosen.endIso);
    }
    startTransition(async () => {
      const outcome = await saveReservationAction(data);
      setResult(outcome);
      if (outcome.status === "success") {
        showToast({ message: outcome.message });
        onSuccess();
      }
    });
  }

  return (
    <form
      ref={formRef}
      className="section"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {initial.reservationId && <input type="hidden" name="reservationId" value={initial.reservationId} />}

      {mode === "create" ? (
        <Field name="resourceId" label="Resource" error={errors.resourceId?.[0]}>
          <select {...fieldProps("resourceId", errors.resourceId?.[0])} defaultValue={initial.resourceId}>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>
      ) : (
        <p>Resource: <strong>{resourceName}</strong></p>
      )}

      <Field name="title" label="Title" error={errors.title?.[0]}>
        <input {...fieldProps("title", errors.title?.[0])} defaultValue={initial.title} required maxLength={120} placeholder="Weekly planning" />
      </Field>

      <Field
        name="startsAtLocal"
        label="Starts (Sri Lanka time)"
        error={errors.startsAtLocal?.[0]}
        hint={initial.startLocked ? "Already started: only the end time can change." : undefined}
      >
        <input
          {...fieldProps("startsAtLocal", errors.startsAtLocal?.[0], Boolean(initial.startLocked))}
          type="datetime-local"
          step={900}
          defaultValue={initial.startsAtLocal}
          readOnly={initial.startLocked}
          required
        />
      </Field>

      <Field name="endsAtLocal" label="Ends (Sri Lanka time)" error={errors.endsAtLocal?.[0]} hint="15-minute steps, up to 8 hours.">
        <input {...fieldProps("endsAtLocal", errors.endsAtLocal?.[0], true)} type="datetime-local" step={900} defaultValue={initial.endsAtLocal} required />
      </Field>

      <Field name="notes" label="Notes (optional)" error={errors.notes?.[0]}>
        <textarea {...fieldProps("notes", errors.notes?.[0])} defaultValue={initial.notes} maxLength={1000} />
      </Field>

      {result?.status === "invalid" && <p role="alert" className="error">⚠ {result.message}</p>}
      {result?.status === "error" && <p role="alert" className="error">⚠ {result.message}</p>}

      {result?.status === "conflict" && (
        <div className="conflict" role="alert">
          <h3>⚠ That time is taken</h3>
          <ul>
            {result.conflicts.map((c) => (
              <li key={`${c.title}-${c.window}`}>
                <strong>{c.holderName}</strong> has “{c.title}” <span className="mono">{c.window}</span>
              </li>
            ))}
          </ul>
          {suggestions.length > 0 && (
            <>
              <p>Book one of these instead, in one click:</p>
              <div className="chips">
                {suggestions.map((s) => (
                  <button key={`${s.resourceId}-${s.startIso}`} type="button" className="chip" disabled={pending} onClick={() => submit(s)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="dialog-actions">
        <button className="btn btn--primary" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Book it" : "Save changes"}
        </button>
      </div>
    </form>
  );
}