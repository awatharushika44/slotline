/** Adds minutes to "YYYY-MM-DDTHH:mm". Wall-clock maths: fine for Colombo (no daylight saving). */
export function addMinutesToLocal(local: string, minutes: number): string {
  return new Date(Date.parse(`${local}:00Z`) + minutes * 60_000).toISOString().slice(0, 16);
}