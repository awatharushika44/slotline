"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { saveReservationAction } from "@/app/reservations/actions";
import { useToast } from "./toast-host";

interface Props {
  resourceId: string;
  startIso: string;
  endIso: string;
}

export function SlotBookForm({ resourceId, startIso, endIso }: Props) {
  const inputId = useId();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  if (booked) return <span className="badge badge--busy">■ Booked</span>;

  return (
    <form
      className="slot-book"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        data.set("slotResourceId", resourceId);
        data.set("slotStart", startIso);
        data.set("slotEnd", endIso);
        startTransition(async () => {
          const result = await saveReservationAction(data);
          if (result.status === "success") {
            setBooked(true);
            showToast({ message: result.message });
            router.refresh();
          } else if (result.status === "conflict") {
            setMessage("Someone just took this slot. Search again.");
          } else if (result.status === "invalid") {
            setMessage(result.fieldErrors.title?.[0] ?? result.message);
          } else {
            setMessage(result.message);
          }
        });
      }}
    >
      <label className="visually-hidden" htmlFor={inputId}>Title</label>
      <input id={inputId} name="title" required maxLength={120} placeholder="Title for the booking" />
      <button className="btn btn--primary" disabled={pending}>{pending ? "Booking…" : "Book"}</button>
      {message && <span role="alert" className="error">⚠ {message}</span>}
    </form>
  );
}