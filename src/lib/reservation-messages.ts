import type { ReservationError } from "@/lib/services/reservation-service";

export function describeReservationError(error: ReservationError): string {
  switch (error.code) {
    case "RESOURCE_NOT_FOUND": return "That resource no longer exists.";
    case "RESOURCE_INACTIVE": return "This resource is archived and cannot be booked.";
    case "NOT_FOUND": return "That reservation no longer exists.";
    case "FORBIDDEN": return error.reason;
    case "START_LOCKED": return "This booking has already started, so its start time cannot change.";
    case "STATE_CHANGED": return "This booking changed while you were looking at it. Please try again.";
    case "INVALID_WINDOW": return error.violations.map((v) => v.message).join(" ");
    case "CONFLICT": return "That time is already taken.";
  }
}