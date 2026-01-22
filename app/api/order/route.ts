import { getUserOrders } from "@/app/services/order-service";
import { ApiResponse } from "@/types/api";
import { OrderDTO } from "@/types/orders";
import { auth } from "@clerk/nextjs/server";
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
            }, {
                status: 401
            })
        }
        // 2. Call Service
        const response = await getUserOrders(userId);
        let status = 200;
        if(!response.success) {
            status = response.error?.code === "INTERNAL_ERROR" ? 500 : 400;
        }

        return NextResponse.json<ApiResponse<OrderDTO[]>>(response, {status});
    } catch (error) {
        console.error("getUserOrders Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, {
            status: 500
        })
    }
}