import { getAdminAnalytics } from "@/app/services/admin-analytics";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/schemas";
import { AnalyticsSummary } from "@/types/analytics";
import { ApiResponse } from "@/types/api";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        //1. Authentication check
        const { userId } = await auth();
        if(!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 });
        }

        //2. Authorization check (Database Role check)
        // Best Practice: Always check DB for role, don't trust client-side claims
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { role: true }
        });

        if(!user || user.role !== "admin") {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Forbidden: Admin access required",
                data: null,
                error: { code: "FORBIDDEN" }
            }, { status: 403 });
        }

        // 3. Call Analytics Service
        const response = await getAdminAnalytics();

        let status = 200;
        if(!response.success) {
            status = response.error?.code === "INTERNAL_ERROR" ? 500 : 400;
        }
        return NextResponse.json<ApiResponse<AnalyticsSummary>>(response, { status });
    } catch (error) {
        console.error("Admin Analytics Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}

