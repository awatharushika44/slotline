"use client";

import { useTransition } from "react";
import { cancelReservationAction, restoreReservationAction } from "@/app/reservations/actions";
import { useToast } from "./toast-host";

export function CancelReservationButton({ reservationId, onDone }: { reservationId: string; onDone?: () => void }) {
  const showToast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn--danger"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await cancelReservationAction(reservationId);
          if (!result.ok) {
            showToast({ message: result.message });
            return;
          }
          onDone?.();
          showToast({
            message: "Booking cancelled.",
            actionLabel: "Undo",
            onAction: async () => {
              const undo = await restoreReservationAction(reservationId);
              showToast({ message: undo.ok ? "Booking restored." : undo.message });
            },
          });
        })
      }
    >
      {pending ? "Cancelling…" : "Cancel booking"}
    </button>
  );
}