import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/schemas";
import { ApiResponse } from "@/types/api";
import { SalesChartDataPoint } from "@/types/analytics";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getSalesChartData } from "@/app/services/sales-chart";

export async function GET(req: NextRequest) {
  try {
    // 1. Auth & Admin Check
    const { userId } = await auth();
    if(!userId) {
      return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: "Unauthorized",
          data: null,
          error: { code: "UNAUTHORIZED" }
      }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });

    if(!user || user.role !== "admin") {
      return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: "Forbidden: Admin access required",
          data: null,
          error: { code: "FORBIDDEN" }
      }, {status: 403});
    }

    // 2. Get & validate range from query param
    const { searchParams } = new URL(req.url);
    // if 'from' and 'to' in query params, means range is custom
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to"); 
    const rangeParam = searchParams.get("range");

    let finalRange: "7d" | "30d" | "12m" | "all" | "custom" = "7d";
    let customStart: Date | undefined;
    let customEnd: Date | undefined;

    if (fromParam && toParam) {
            const start = new Date(fromParam);
            const end = new Date(toParam);
            
            // Validate ki dates sahi hain
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                finalRange = "custom";
                customStart = start;
                customEnd = end;
            }
        }
        // LOGIC PRIORITY: if no custome dates, then check range param
        else if (rangeParam) {
            const validRanges = ["7d", "30d", "12m", "all"];
            if (validRanges.includes(rangeParam)) {
                finalRange = rangeParam as any;
            }
        }

    // 3. Call service with options object
    const response = await getSalesChartData({
      range: finalRange,
      customStart,
      customEnd
    });

    return NextResponse.json<ApiResponse<SalesChartDataPoint[]>>(response, {
      status: response.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Sales Chart Route Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: { code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}