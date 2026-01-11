import { addToCart } from "@/app/services/cart-service";
import { addToCartSchema } from "@/app/validations/cartZodSchema";
import { ApiResponse } from "@/types/api";
import { CartDTO } from "@/types/carts";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        //1. Authentication clerk
        const { userId } = await auth();
        if(!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 });
        }
        // 2. Parse & Validate Request Body
        const body = await req.json();
        const parse = addToCartSchema.safeParse(body);

        if(!parse.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Validation Error",
                data: null,
                error: { code: "VALIDATION_ERROR" },
            }, { status: 400 });
        }
        // 3. Call Service Logic
        const response = await addToCart(userId, parse.data);
        // 4. Determine Status Code
        let status = 200; // Created
        if(!response.success) {
            if(response.error?.code === "PRODUCT_NOT_FOUND") status = 404;
            else if(response.error?.code === "BAD_REQUEST") status = 400;
            else if(response.error?.code === "STOCK_LIMIT") status = 409;
            else status = 500;
        }
        return NextResponse.json<ApiResponse<CartDTO>>(response, { status });
    } catch (error) {
        console.error("Cart Post Error: ", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}