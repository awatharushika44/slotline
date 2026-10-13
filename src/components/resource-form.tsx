"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveResourceAction } from "@/app/resources/actions";
import type { ResourceFormState } from "@/app/resources/form-state";
import { CATEGORY_LABELS, RESOURCE_CATEGORIES } from "@/lib/domain/resource-categories";
import { Field, fieldProps } from "./field";

interface Props {
  resource?: {
    id: string;
    name: string;
    category: string;
    capacity: number;
    location: string | null;
    description: string | null;
  };
}

const initialState: ResourceFormState = {};

export function ResourceForm({ resource }: Props) {
  const [state, formAction, pending] = useActionState(saveResourceAction, initialState);
  const values = state.values ?? {
    name: resource?.name ?? "",
    category: resource?.category ?? "room",
    capacity: String(resource?.capacity ?? 1),
    location: resource?.location ?? "",
    description: resource?.description ?? "",
  };
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card form-card">
      {resource && <input type="hidden" name="id" value={resource.id} />}
      {state.message && <p role="alert" className="error">⚠ {state.message}</p>}

      <Field name="name" label="Name" error={errors.name?.[0]}>
        <input {...fieldProps("name", errors.name?.[0])} defaultValue={values.name} required maxLength={80} />
      </Field>

      <Field name="category" label="Category" error={errors.category?.[0]}>
        <select {...fieldProps("category", errors.category?.[0])} defaultValue={values.category}>
          {RESOURCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </Field>

      <Field name="capacity" label="Capacity" error={errors.capacity?.[0]} hint="How many people or items it serves.">
        <input {...fieldProps("capacity", errors.capacity?.[0], true)} type="number" min={1} max={1000} defaultValue={values.capacity} required />
      </Field>

      <Field name="location" label="Location (optional)" error={errors.location?.[0]}>
        <input {...fieldProps("location", errors.location?.[0])} defaultValue={values.location} maxLength={120} />
      </Field>

      <Field name="description" label="Description (optional)" error={errors.description?.[0]}>
        <textarea {...fieldProps("description", errors.description?.[0])} defaultValue={values.description} maxLength={500} />
      </Field>

      <div className="form-actions">
        <button className="btn btn--primary" disabled={pending}>
          {pending ? "Saving…" : resource ? "Save changes" : "Create resource"}
        </button>
        <Link className="btn btn--ghost" href="/resources">Cancel</Link>
      </div>
    </form>
  );
}