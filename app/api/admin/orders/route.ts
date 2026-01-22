import { getAllOrders } from "@/app/services/order-service";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/schemas";
import { ApiResponse } from "@/types/api";
import { AdminOrderDTO } from "@/types/orders";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        // 1. Authentication Check
        const { userId } = await auth();
        if(!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 });
        }
        // 2. Authorization Check (RBAC - Role Based Access Control)
        // check the database for the role of the user
        // don't rely on clerk session metadata, DB check is more secure
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
            }, {status: 403});
        }

        // 3. Call Service
        const response = await getAllOrders();
        let status = 200;
        if(!response.success) {
            status = response.error?.code === "INTERNAL_ERROR" ? 500 : 400;
        }
        return NextResponse.json<ApiResponse<AdminOrderDTO[]>>(response, { status });
    } catch (error) {
        console.error("Admin GetOrders Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}