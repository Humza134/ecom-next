import { getCart } from "@/app/services/cart-service";
import { ApiResponse } from "@/types/api";
import { CartDTO } from "@/types/carts";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if(!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 });
        }
        // call service
        const response = await getCart(userId);
        let status = 200;
        if(!response.success) {
            status = response.error?.code === "INTERNAL_ERROR" ? 500 : 400;
        }
        return NextResponse.json<ApiResponse<CartDTO>>(response, { status });
    } catch (error) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}