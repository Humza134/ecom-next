import { createCheckoutSession } from "@/app/services/checkout-service";
import { checkoutSchema } from "@/app/validations/checkoutZodSchema";
import { ApiResponse } from "@/types/api";
import { CheckoutResponseDTO } from "@/types/checkout";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        //1. Auth check
        const { userId } = await auth();
        if(!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 })
        }

        // 2. Parse Body & Validate Zod Schema
        const body = await req.json();
        const validationResult = checkoutSchema.safeParse(body);
        if(!validationResult.success) {
            // const errorMessage = validationResult.error.errors.map(e => e.message).join(", ");
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Validation Error",
                data: null,
                error: { code: "VALIDATION_ERROR" }
            }, { status: 400 });
        }

        // 3. Call Service
        const response = await createCheckoutSession(userId, validationResult.data);

        // 4. Handle Service Response Status Code
        // let status = 200;
        // if (!response.success) {
        // // Agar logical error hai (Out of stock, empty cart) to 400, warna server error 500
        // switch (response.error?.code) {
        //     case "CART_EMPTY":
        //     case "OUT_OF_STOCK":
        //     status = 400;
        //     break;
        //     case "INTERNAL_ERROR":
        //     default:
        //     status = 500;
        // }
        // }

        let status = response.success ? 200 : 400;
        if (response.error?.code === "INTERNAL_SERVER_ERROR") {
        status = 500;
        }

        return NextResponse.json<ApiResponse<CheckoutResponseDTO>>(response, { status });
    } catch (error) {
        console.error("[CHECKOUT_ROUTE_ERROR]", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_SERVER_ERROR" }
        }, { status: 500 });
    }
}