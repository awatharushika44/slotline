"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CancelReservationButton } from "./cancel-reservation-button";
import { ReservationForm } from "./reservation-form";
import type { TimelineBlock } from "./timeline-types";

export type DialogState =
  | { kind: "create"; resourceId: string; startsAtLocal: string; endsAtLocal: string }
  | { kind: "details"; block: TimelineBlock; resourceName: string }
  | { kind: "edit"; block: TimelineBlock; resourceName: string };

interface Props {
  state: DialogState | null;
  onChange: (state: DialogState | null) => void;
  bookableResources: { id: string; name: string }[];
}

export function ReservationDialog({ state, onChange, bookableResources }: Props) {
  const close = () => onChange(null);

  return (
    <Dialog.Root open={state !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog">
          <Dialog.Close asChild>
            <button type="button" className="btn btn--ghost btn--small dialog-close" aria-label="Close">✕</button>
          </Dialog.Close>

          {state?.kind === "create" && (
            <>
              <Dialog.Title>New booking</Dialog.Title>
              <Dialog.Description className="muted">
                If the slot is taken, you will see who holds it and the nearest free options.
              </Dialog.Description>
              <ReservationForm
                mode="create"
                resources={bookableResources}
                initial={{ resourceId: state.resourceId, title: "", notes: "", startsAtLocal: state.startsAtLocal, endsAtLocal: state.endsAtLocal }}
                onSuccess={close}
              />
            </>
          )}

          {state?.kind === "details" && (
            <>
              <Dialog.Title>{state.block.title}</Dialog.Title>
              <Dialog.Description className="muted">
                {state.resourceName} · <span className="mono">{state.block.timeLabel}</span>
              </Dialog.Description>
              <p>Booked by <strong>{state.block.holderName}{state.block.mine ? " (you)" : ""}</strong></p>
              {state.block.notes && <p>{state.block.notes}</p>}
              {state.block.canEdit || state.block.canCancel ? (
                <div className="dialog-actions">
                  {state.block.canEdit && (
                    <button type="button" className="btn btn--primary" onClick={() => onChange({ kind: "edit", block: state.block, resourceName: state.resourceName })}>
                      Edit
                    </button>
                  )}
                  {state.block.canCancel && <CancelReservationButton reservationId={state.block.id} onDone={close} />}
                </div>
              ) : (
                <p className="muted">Read-only: you can only change your own upcoming or ongoing bookings.</p>
              )}
            </>
          )}

          {state?.kind === "edit" && (
            <>
              <Dialog.Title>Edit booking</Dialog.Title>
              <Dialog.Description className="muted">Changes are checked against every other booking.</Dialog.Description>
              <ReservationForm
                mode="edit"
                resources={bookableResources}
                resourceName={state.resourceName}
                initial={{
                  reservationId: state.block.id,
                  resourceId: state.block.resourceId,
                  title: state.block.title,
                  notes: state.block.notes ?? "",
                  startsAtLocal: state.block.startsAtLocal,
                  endsAtLocal: state.block.endsAtLocal,
                  startLocked: state.block.startLocked,
                }}
                onSuccess={close}
              />
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}