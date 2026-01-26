import { db } from "@/lib/db";
import { and, gte, lte, sql } from "drizzle-orm";
import type { ApiResponse } from "@/types/api";
import { orders } from "@/lib/db/schema/schemas";
import { SalesChartDataPoint } from "@/types/analytics";
import calculateStartDate from "@/lib/utils";


type DateRange = "7d" | "30d" | "all" | "12m" | "ytd" | "custom";

interface GetSalesChartOptions {
  range: DateRange;
  // add custom dates if needed
  customStart?: Date;
  customEnd?: Date;
  timezone?: string; // optional – can be used later for user-specific TZ
}

/**
 * Returns daily/monthly sales data with zero-filling for missing periods
 * Ready for line/bar/area charts
 */
export async function getSalesChartData(
  options: GetSalesChartOptions
): Promise<ApiResponse<SalesChartDataPoint[]>> {
  const { range, customStart, customEnd } = options;

  try {
    let startDate: Date;
    let endDate = new Date(); // default to today

    // logic for custom dates
    if(range === "custom" && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
      // The clock must be set at the last second of the day.
      endDate.setHours(23, 59, 59, 999); 
    } else {
      startDate = calculateStartDate(range as Exclude<DateRange, "custom">, endDate);
    }

    

    const isMonthly = range === "12m" || range === "all";
    const timeUnit = isMonthly ? "month" : "day";

    // ── Main aggregation query ──────────────────────────────────────
    const results = await db
      .select({
        period: sql<string>`date_trunc(${sql.raw(timeUnit)}, ${orders.createdAt})::date`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        orderCount: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
          sql`${orders.status} NOT IN ('cancelled', 'failed', 'refunded')`
        )
      )
      .groupBy(sql`1`) // group by the first column (period)
      .orderBy(sql`1`);

    // ── Create lookup map ───────────────────────────────────────────
    const dataMap = new Map<string, { revenue: number; orderCount: number }>();

    for (const row of results) {
      // We force ::date in postgres → should be YYYY-MM-DD already
      const dateKey = row.period.toString().split("T")[0];
      dataMap.set(dateKey, {
        revenue: Number(row.revenue),
        orderCount: Number(row.orderCount),
      });
    }

    // ── Generate complete timeline with zero filling ────────────────
    const chartData: SalesChartDataPoint[] = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = current.toISOString().split("T")[0];

      const entry = dataMap.get(dateKey);

      chartData.push({
        name: dateKey,
        sales: entry?.revenue ?? 0,
        orderCount: entry?.orderCount ?? 0,
      });

      // Increment
      if (isMonthly) {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }

    return {
      success: true,
      message: "Sales chart data loaded successfully",
      data: chartData,
      meta: {
        range,
        points: chartData.length,
        from: chartData[0]?.name,
        to: chartData.at(-1)?.name,
      },
    };
  } catch (err) {
    console.error("[getSalesChartData] Failed:", err);

    return {
      success: false,
      message: "Internal Server Error",
      data: null,
      error: { code: "INTERNAL_ERROR" }
    };
  }
}

