import { getBookedHoursPerResource, getHeatCells, getTopUsers, getTotals } from "@/lib/db/insights-repo";
import { buildHeatGrid, utilizationPercent } from "@/lib/domain/insights";
import { addDaysYmd, dayRangeUtc, todayInColombo } from "@/lib/time/zone";

/** The last `days` Colombo days, ending today. */
export async function getInsights(days: number, now: Date) {
  const today = todayInColombo(now);
  const fromYmd = addDaysYmd(today, -(days - 1));
  const range = { start: dayRangeUtc(fromYmd).start, end: dayRangeUtc(today).end };

  const [hours, heatCells, topUsers, totals] = await Promise.all([
    getBookedHoursPerResource(fromYmd, days),
    getHeatCells(range),
    getTopUsers(range),
    getTotals(range),
  ]);

  const utilization = hours
    .map((row) => ({ ...row, percent: utilizationPercent(row.bookedHours, days) }))
    .sort((a, b) => b.percent - a.percent);

  return {
    fromYmd,
    today,
    utilization,
    totalBookedHours: hours.reduce((sum, row) => sum + row.bookedHours, 0),
    heat: buildHeatGrid(heatCells),
    topUsers,
    totals,
  };
}