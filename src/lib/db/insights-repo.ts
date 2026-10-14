import { sql } from "drizzle-orm";
import type { HeatCell } from "@/lib/domain/insights";
import type { TimeRange } from "@/lib/domain/overlap";
import { WORKDAY_END, WORKDAY_START } from "@/lib/domain/working-hours";
import { db } from "./client";

export interface UtilizationRow {
  resourceId: string;
  name: string;
  bookedHours: number;
}

/**
 * Booked hours per active resource, clipped to the working window of each Colombo day.
 * A reservation that runs 17:00-20:00 only counts 17:00-18:00.
 */
export async function getBookedHoursPerResource(fromYmd: string, days: number): Promise<UtilizationRow[]> {
  const result = await db.execute<{ id: string; name: string; booked_hours: string }>(sql`
    WITH days AS (
      SELECT (${fromYmd}::date + i) AS day
      FROM generate_series(0, ${days}::int - 1) AS i
    ),
    windows AS (
      SELECT (day::timestamp + ${WORKDAY_START}::time) AT TIME ZONE 'Asia/Colombo' AS w_start,
             (day::timestamp + ${WORKDAY_END}::time)   AT TIME ZONE 'Asia/Colombo' AS w_end
      FROM days
    )
    SELECT r.id, r.name,
      COALESCE(
        SUM(EXTRACT(EPOCH FROM (LEAST(b.ends_at, w.w_end) - GREATEST(b.starts_at, w.w_start))) / 3600)
          FILTER (WHERE b.id IS NOT NULL),
        0
      ) AS booked_hours
    FROM resources r
    CROSS JOIN windows w
    LEFT JOIN reservations b
      ON b.resource_id = r.id
     AND b.status = 'active'
     AND b.starts_at < w.w_end
     AND b.ends_at > w.w_start
    WHERE r.is_active
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);
  return result.rows.map((row) => ({ resourceId: row.id, name: row.name, bookedHours: Number(row.booked_hours) }));
}

/** Booking-hours per weekday and hour (Colombo time). A booking counts once per hour it touches. */
export async function getHeatCells(range: TimeRange): Promise<HeatCell[]> {
  const result = await db.execute<{ dow: number; hour: number; bookings: number }>(sql`
    SELECT EXTRACT(ISODOW FROM (h.slot AT TIME ZONE 'Asia/Colombo'))::int AS dow,
           EXTRACT(HOUR   FROM (h.slot AT TIME ZONE 'Asia/Colombo'))::int AS hour,
           COUNT(*)::int AS bookings
    FROM reservations r
    CROSS JOIN LATERAL generate_series(
      date_trunc('hour', r.starts_at, 'Asia/Colombo'),
      r.ends_at - interval '1 microsecond',
      interval '1 hour'
    ) AS h(slot)
    WHERE r.status = 'active'
      AND r.starts_at >= ${range.start}::timestamptz
      AND r.starts_at <  ${range.end}::timestamptz
    GROUP BY 1, 2
  `);
  return result.rows.map((row) => ({ isoDow: row.dow, hour: row.hour, bookings: row.bookings }));
}

export async function getTopUsers(range: TimeRange, limit = 5) {
  const result = await db.execute<{ name: string; bookings: number; hours: string }>(sql`
    SELECT u.name,
           COUNT(*)::int AS bookings,
           ROUND(SUM(EXTRACT(EPOCH FROM (r.ends_at - r.starts_at)) / 3600)::numeric, 1) AS hours
    FROM reservations r
    JOIN users u ON u.id = r.user_id
    WHERE r.status = 'active'
      AND r.starts_at >= ${range.start}::timestamptz
      AND r.starts_at <  ${range.end}::timestamptz
    GROUP BY u.id, u.name
    ORDER BY SUM(EXTRACT(EPOCH FROM (r.ends_at - r.starts_at))) DESC
    LIMIT ${limit}::int
  `);
  return result.rows.map((row) => ({ name: row.name, bookings: row.bookings, hours: Number(row.hours) }));
}

export async function getTotals(range: TimeRange) {
  const result = await db.execute<{ active: number; cancelled: number }>(sql`
    SELECT COUNT(*) FILTER (WHERE status = 'active')::int    AS active,
           COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
    FROM reservations
    WHERE starts_at >= ${range.start}::timestamptz AND starts_at < ${range.end}::timestamptz
  `);
  const row = result.rows[0];
  return { active: row?.active ?? 0, cancelled: row?.cancelled ?? 0 };
}