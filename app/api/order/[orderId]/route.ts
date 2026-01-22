import { getOrderById } from "@/app/services/order-service";
import { orderIdParamSchema } from "@/app/validations/orderZodSchema";
import { ApiResponse } from "@/types/api";
import { OrderDTO } from "@/types/orders";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET (req: NextRequest, context: RouteContext) {
    try {
        // 1. Authentication Check
        const { userId } = await auth();
        if (!userId) {
          return NextResponse.json<ApiResponse<null>>(
            {
              success: false,
              message: "Unauthorized",
              data: null,
              error: { code: "UNAUTHORIZED" },
            },
            { status: 401 }
          );
        }
        // 2. Validate params
        const params = await context.params;
        const paramsValidation = orderIdParamSchema.safeParse(params);
        if(!paramsValidation.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Params ID Validation Error",
                data: null,
                error: { code: "VALIDATION_ERROR", details: paramsValidation.error.flatten() },
            }, { status: 400 });
        }
        const orderId = paramsValidation.data.orderId;
        // 3. Call Service
        const response = await getOrderById(orderId, userId);
        // 4. Handle Specific Status Codes
        let status = 200;
        if (!response.success) {
          if (response.error?.code === "FORBIDDEN") status = 403;
          else if (response.error?.code === "NOT_FOUND") status = 404;
          else status = 500;
        }
        return NextResponse.json<ApiResponse<OrderDTO>>(response, { status });
    } catch (error) {
        console.error("Order Get Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}